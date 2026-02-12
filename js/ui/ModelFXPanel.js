const PARAM_CONTROL_CONFIG = [
	{ key: 'pointCount', label: 'Point Count', min: 1000, max: 35000, step: 100, formatter: ( value ) => Math.round( value ).toLocaleString() },
	{ key: 'attraction', label: 'Attraction', min: 0, max: 12, step: 0.05, formatter: ( value ) => value.toFixed( 2 ) },
	{ key: 'noiseStrength', label: 'Noise Strength', min: 0, max: 4, step: 0.05, formatter: ( value ) => value.toFixed( 2 ) },
	{ key: 'noiseScale', label: 'Noise Scale', min: 0.1, max: 6, step: 0.05, formatter: ( value ) => value.toFixed( 2 ) },
	{ key: 'noiseSpeed', label: 'Noise Speed', min: 0, max: 5, step: 0.05, formatter: ( value ) => value.toFixed( 2 ) },
	{ key: 'orbitStrength', label: 'Orbit Strength', min: 0, max: 6, step: 0.05, formatter: ( value ) => value.toFixed( 2 ) },
	{ key: 'damping', label: 'Damping', min: 0.2, max: 8, step: 0.05, formatter: ( value ) => value.toFixed( 2 ) },
	{ key: 'pointSize', label: 'Point Size', min: 0.01, max: 0.3, step: 0.005, formatter: ( value ) => value.toFixed( 3 ) },
	{ key: 'jitter', label: 'Jitter', min: 0, max: 2, step: 0.01, formatter: ( value ) => value.toFixed( 2 ) },
	{ key: 'pulseStrength', label: 'Pulse Strength', min: 0, max: 0.9, step: 0.01, formatter: ( value ) => value.toFixed( 2 ) },
	{ key: 'pulseSpeed', label: 'Pulse Speed', min: 0.1, max: 6, step: 0.05, formatter: ( value ) => value.toFixed( 2 ) }
];

function clamp( value, minValue, maxValue ) {

	return Math.max( minValue, Math.min( maxValue, value ) );

}

function parseNumeric( value, fallback, minValue, maxValue ) {

	const parsed = Number( value );
	if ( ! Number.isFinite( parsed ) ) return fallback;
	return clamp( parsed, minValue, maxValue );

}

export class ModelFXPanel {

	constructor( container, options = {} ) {

		this.container = container;
		this.options = options;
		this.root = null;
		this.state = null;
		this.enabled = true;
		this.pendingParams = {};
		this.pendingFrame = 0;
		this.isSyncing = false;
		this.paramInputs = new Map();
		this.paramValueNodes = new Map();
		this.demoButtons = new Map();

		if ( this.container ) this._render();

	}

	_render() {

		this.root = document.createElement( 'section' );
		this.root.className = 'model-fx-panel hidden';

		const titleRow = document.createElement( 'div' );
		titleRow.className = 'model-fx-title-row';

		const title = document.createElement( 'h3' );
		title.textContent = 'Model FX';
		titleRow.appendChild( title );

		this.sourceLabel = document.createElement( 'span' );
		this.sourceLabel.className = 'model-fx-source';
		this.sourceLabel.textContent = 'No model loaded';
		titleRow.appendChild( this.sourceLabel );

		this.root.appendChild( titleRow );

		const uploadRow = document.createElement( 'label' );
		uploadRow.className = 'model-fx-upload';
		uploadRow.textContent = 'Load GLB';

		this.fileInput = document.createElement( 'input' );
		this.fileInput.type = 'file';
		this.fileInput.accept = '.glb,.gltf,model/gltf-binary,model/gltf+json';
		this.fileInput.addEventListener( 'change', async () => {

			const file = this.fileInput.files?.[ 0 ];
			if ( ! file || ! this.options.onLoadFile ) return;
			try {

				await this.options.onLoadFile( file );

			} finally {

				this.fileInput.value = '';

			}

		} );
		uploadRow.appendChild( this.fileInput );
		this.root.appendChild( uploadRow );

		const demoRow = document.createElement( 'div' );
		demoRow.className = 'model-fx-demo-row';

		const demoLabel = document.createElement( 'span' );
		demoLabel.className = 'model-fx-row-label';
		demoLabel.textContent = 'Demo Models';
		demoRow.appendChild( demoLabel );

		this.demoContainer = document.createElement( 'div' );
		this.demoContainer.className = 'model-fx-demo-chips';
		demoRow.appendChild( this.demoContainer );
		this.root.appendChild( demoRow );

		const samplingRow = document.createElement( 'div' );
		samplingRow.className = 'model-fx-select-row';

		const samplingLabel = document.createElement( 'label' );
		samplingLabel.textContent = 'Sampling';
		samplingRow.appendChild( samplingLabel );

		this.samplingSelect = document.createElement( 'select' );
		this.samplingSelect.innerHTML = '<option value="surface">Surface</option><option value="vertex">Vertex</option>';
		this.samplingSelect.addEventListener( 'change', () => {

			this._queueParamChange( 'samplingMode', this.samplingSelect.value );

		} );
		samplingRow.appendChild( this.samplingSelect );
		this.root.appendChild( samplingRow );

		for ( let i = 0; i < PARAM_CONTROL_CONFIG.length; i ++ ) {

			const config = PARAM_CONTROL_CONFIG[ i ];
			const row = document.createElement( 'div' );
			row.className = 'model-fx-slider-row';

			const label = document.createElement( 'label' );
			label.textContent = config.label;
			row.appendChild( label );

			const valueNode = document.createElement( 'span' );
			valueNode.className = 'model-fx-value';
			valueNode.textContent = config.formatter( config.min );
			row.appendChild( valueNode );

			const input = document.createElement( 'input' );
			input.type = 'range';
			input.min = String( config.min );
			input.max = String( config.max );
			input.step = String( config.step );
			input.value = String( config.min );
			input.addEventListener( 'input', () => {

				const parsed = parseNumeric( input.value, config.min, config.min, config.max );
				valueNode.textContent = config.formatter( parsed );
				this._queueParamChange( config.key, parsed );

			} );
			row.appendChild( input );

			this.paramInputs.set( config.key, input );
			this.paramValueNodes.set( config.key, valueNode );
			this.root.appendChild( row );

		}

		const actionRow = document.createElement( 'div' );
		actionRow.className = 'model-fx-action-row';

		this.resetModelButton = document.createElement( 'button' );
		this.resetModelButton.type = 'button';
		this.resetModelButton.textContent = 'Reset Model';
		this.resetModelButton.addEventListener( 'click', () => {

			if ( this.options.onResetModel ) this.options.onResetModel();

		} );
		actionRow.appendChild( this.resetModelButton );

		this.resetParamsButton = document.createElement( 'button' );
		this.resetParamsButton.type = 'button';
		this.resetParamsButton.textContent = 'Reset Params';
		this.resetParamsButton.addEventListener( 'click', () => {

			if ( this.options.onResetParams ) this.options.onResetParams();

		} );
		actionRow.appendChild( this.resetParamsButton );

		this.root.appendChild( actionRow );
		this.container.appendChild( this.root );

	}

	_queueParamChange( key, value ) {

		this.pendingParams[ key ] = value;
		if ( this.pendingFrame ) return;

		this.pendingFrame = requestAnimationFrame( () => {

			this.pendingFrame = 0;
			const payload = { ...this.pendingParams };
			this.pendingParams = {};
			if ( this.options.onParamsChange ) this.options.onParamsChange( payload );

		} );

	}

	_syncDemoButtons( demos, activeDemoId ) {

		if ( ! this.demoContainer ) return;

		const previousIds = new Set( this.demoButtons.keys() );
		const list = Array.isArray( demos ) ? demos : [];

		for ( let i = 0; i < list.length; i ++ ) {

			const demo = list[ i ];
			if ( ! demo?.id ) continue;

			let button = this.demoButtons.get( demo.id );
			if ( ! button ) {

				button = document.createElement( 'button' );
				button.type = 'button';
				button.className = 'model-fx-demo-chip';
				button.dataset.demoId = demo.id;
				button.addEventListener( 'click', () => {

					if ( this.options.onLoadDemo ) this.options.onLoadDemo( demo.id );

				} );
				this.demoButtons.set( demo.id, button );
				this.demoContainer.appendChild( button );

			}

			button.textContent = demo.name || demo.id;
			button.classList.toggle( 'active', demo.id === activeDemoId );
			previousIds.delete( demo.id );

		}

		for ( const staleId of previousIds ) {

			const staleButton = this.demoButtons.get( staleId );
			if ( staleButton && staleButton.parentNode ) staleButton.parentNode.removeChild( staleButton );
			this.demoButtons.delete( staleId );

		}

	}

	sync( state ) {

		if ( ! this.root || ! state ) return;

		this.state = state;
		this.isSyncing = true;

		this.sourceLabel.textContent = state.sourceLabel || 'No model loaded';
		this.samplingSelect.value = state.params?.samplingMode === 'vertex' ? 'vertex' : 'surface';

		for ( let i = 0; i < PARAM_CONTROL_CONFIG.length; i ++ ) {

			const config = PARAM_CONTROL_CONFIG[ i ];
			const input = this.paramInputs.get( config.key );
			const valueNode = this.paramValueNodes.get( config.key );
			if ( ! input || ! valueNode ) continue;

			const rawValue = state.params?.[ config.key ];
			const safeValue = parseNumeric(
				rawValue,
				config.min,
				config.min,
				config.max
			);
			input.value = String( safeValue );
			valueNode.textContent = config.formatter( safeValue );

		}

		this._syncDemoButtons( state.demos, state.activeDemoId );
		this.isSyncing = false;

	}

	setVisible( visible ) {

		if ( ! this.root ) return;
		this.root.classList.toggle( 'hidden', ! visible );

	}

	setEnabled( enabled ) {

		this.enabled = enabled === true;
		if ( ! this.root ) return;

		const nodes = this.root.querySelectorAll( 'input, select, button' );
		nodes.forEach( ( node ) => {

			node.disabled = ! this.enabled;

		} );

	}

	dispose() {

		if ( this.pendingFrame ) cancelAnimationFrame( this.pendingFrame );
		this.pendingFrame = 0;
		this.pendingParams = {};
		this.demoButtons.clear();
		this.paramInputs.clear();
		this.paramValueNodes.clear();

		if ( this.root && this.root.parentNode ) this.root.parentNode.removeChild( this.root );
		this.root = null;

	}

}
