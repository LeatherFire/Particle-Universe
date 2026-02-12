import {
	SHADER_NODE_DEFINITIONS,
	SHADER_NODE_CATEGORIES,
	getNodeTypesByCategory,
	getNodeTypesByTier,
	createNodeDescriptor
} from '../shaderbuilder/ShaderNodeDefinitions.js';

function deepClone( value ) {

	return JSON.parse( JSON.stringify( value ) );

}

function clampNumber( value, minValue, maxValue, fallback ) {

	const parsed = Number( value );
	if ( ! Number.isFinite( parsed ) ) return fallback;
	return Math.max( minValue, Math.min( maxValue, parsed ) );

}

function graphSignature( graph ) {

	if ( ! graph ) return '';
	try {

		return JSON.stringify( graph );

	} catch ( error ) {

		return '';

	}

}

function createBlankGraph() {

	const colorNode = createNodeDescriptor( 'input/vec3', 1, 140, 140 );
	const alphaNode = createNodeDescriptor( 'input/float', 2, 140, 300 );
	alphaNode.properties.value = 1.0;
	const outputNode = createNodeDescriptor( 'output/color', 3, 450, 220 );

	if ( colorNode.outputs?.[ 0 ] ) colorNode.outputs[ 0 ].links = [ 1 ];
	if ( alphaNode.outputs?.[ 0 ] ) alphaNode.outputs[ 0 ].links = [ 2 ];
	if ( outputNode.inputs?.[ 0 ] ) outputNode.inputs[ 0 ].link = 1;
	if ( outputNode.inputs?.[ 1 ] ) outputNode.inputs[ 1 ].link = 2;

	return {
		version: 1,
		last_node_id: 3,
		last_link_id: 2,
		nodes: [ colorNode, alphaNode, outputNode ],
		links: [
			[ 1, 1, 0, 3, 0, 0 ],
			[ 2, 2, 0, 3, 1, 0 ]
		],
		groups: [],
		config: {}
	};

}

const SHADER_WIDGET_META = {
	'input/float': {
		value: {
			label: 'Scalar Value',
			description: 'Single numeric value used to control intensity, speed, thresholds, or math blends.',
			min: - 1000,
			max: 1000,
			step: 0.01,
			precision: 3
		}
	},
	'input/vec2': {
		x: {
			label: 'X Component',
			description: 'Horizontal component. Useful for UV offset, direction, and 2D position control.',
			min: - 1000,
			max: 1000,
			step: 0.01,
			precision: 3
		},
		y: {
			label: 'Y Component',
			description: 'Vertical component. Useful for UV offset, direction, and 2D position control.',
			min: - 1000,
			max: 1000,
			step: 0.01,
			precision: 3
		}
	},
	'input/vec3': {
		x: {
			label: 'Red / X',
			description: 'First channel. Usually treated as Red when this node is used as a color.',
			min: 0,
			max: 1,
			step: 0.01,
			precision: 3
		},
		y: {
			label: 'Green / Y',
			description: 'Second channel. Usually treated as Green when this node is used as a color.',
			min: 0,
			max: 1,
			step: 0.01,
			precision: 3
		},
		z: {
			label: 'Blue / Z',
			description: 'Third channel. Usually treated as Blue when this node is used as a color.',
			min: 0,
			max: 1,
			step: 0.01,
			precision: 3
		}
	}
};

function getShaderWidgetOptions( nodeType, widgetName, fallback = {} ) {

	const meta = SHADER_WIDGET_META[ nodeType ]?.[ widgetName ] || {};
	return {
		...fallback,
		...meta,
		nodeType,
		nodeTitle: SHADER_NODE_DEFINITIONS[ nodeType ]?.title || nodeType,
		propertyName: widgetName,
		propertyLabel: meta.label || widgetName
	};

}

function registerLiteGraphNodes( LiteGraph ) {

	if ( ! LiteGraph ) return;
	if ( window.__PARTICLE_UNIVERSE_SHADER_NODES_REGISTERED__ ) return;

	for ( const [ type, definition ] of Object.entries( SHADER_NODE_DEFINITIONS ) ) {

		if ( LiteGraph.registered_node_types?.[ type ] ) continue;

		const NodeClass = function ShaderBuilderNode() {

			this.title = definition.title;
			this.properties = { ...definition.defaults };
			this.size = [ 180, 68 ];

			for ( const input of definition.inputs ) {

				this.addInput( input.name, input.type );

			}

			for ( const output of definition.outputs ) {

				this.addOutput( output.name, output.type );

			}

			const addNumberWidget = ( name, value, assign ) => {

				this.addWidget(
					'number',
					name,
					value,
					( nextValue ) => assign( nextValue ),
					getShaderWidgetOptions( type, name, { step: 0.01, precision: 3 } )
				);

			};

			if ( type === 'input/float' ) {

				addNumberWidget( 'value', this.properties.value, ( value ) => {

					this.properties.value = value;

				} );

			} else if ( type === 'input/vec2' ) {

				addNumberWidget( 'x', this.properties.x, ( value ) => {

					this.properties.x = value;

				} );
				addNumberWidget( 'y', this.properties.y, ( value ) => {

					this.properties.y = value;

				} );

			} else if ( type === 'input/vec3' ) {

				addNumberWidget( 'x', this.properties.x, ( value ) => {

					this.properties.x = value;

				} );
				addNumberWidget( 'y', this.properties.y, ( value ) => {

					this.properties.y = value;

				} );
				addNumberWidget( 'z', this.properties.z, ( value ) => {

					this.properties.z = value;

				} );

			}

		};

		NodeClass.title = definition.title;
		NodeClass.desc = definition.title;
		LiteGraph.registerNodeType( type, NodeClass );

	}

	window.__PARTICLE_UNIVERSE_SHADER_NODES_REGISTERED__ = true;

}

export class ShaderBuilderPanel {

	constructor( container, options = {} ) {

		this.container = container;
		this.options = options;
		this.root = null;
		this.enabled = true;
		this.state = null;
		this.graph = null;
		this.graphCanvas = null;
		this.liteGraphAvailable = false;
		this.lastGraphSignature = '';
		this.compileTimer = null;
		this.syncingGraph = false;
		this.activeView = 'blueprint';
		this.activeNodeTier = 'basic';
		this.activeResultTab = 'base';
		this.previewContext = null;
		this.lastTemplateId = null;
		this.lastSavedGraphId = null;
		this.hasCenteredInitialGraph = false;
		this.syncingOceanControls = false;
		this.syncingFireControls = false;
		this.syncingPreviewControls = false;
		this.syncingExposedControls = false;
		this.groupStorageKey = 'particle_universe_shader_groups_v1';
		this.groupBlocks = [];

		if ( this.container ) this._render();

	}

	_render() {

		this.root = document.createElement( 'section' );
		this.root.className = 'shader-builder-workspace-panel hidden';

		const toolbar = document.createElement( 'div' );
		toolbar.className = 'shader-builder-toolbar';

		const titleGroup = document.createElement( 'div' );
		titleGroup.className = 'shader-builder-toolbar-group';

		const title = document.createElement( 'h2' );
		title.className = 'shader-builder-title';
		title.textContent = 'Shader Builder';
		titleGroup.appendChild( title );

		this.statusBadge = document.createElement( 'span' );
		this.statusBadge.className = 'shader-builder-status';
		this.statusBadge.textContent = 'idle';
		titleGroup.appendChild( this.statusBadge );

		toolbar.appendChild( titleGroup );

		const actionGroup = document.createElement( 'div' );
		actionGroup.className = 'shader-builder-toolbar-group';

			this.newBlankButton = document.createElement( 'button' );
			this.newBlankButton.type = 'button';
			this.newBlankButton.className = 'shader-builder-toolbar-btn';
			this.newBlankButton.textContent = 'New Blank';
		this.newBlankButton.addEventListener( 'click', () => {

			this._newBlankGraph();

			} );
			actionGroup.appendChild( this.newBlankButton );

			this.centerViewButton = document.createElement( 'button' );
			this.centerViewButton.type = 'button';
			this.centerViewButton.className = 'shader-builder-toolbar-btn';
			this.centerViewButton.textContent = 'Center View';
			this.centerViewButton.addEventListener( 'click', () => {

				this._centerGraphView();

			} );
			actionGroup.appendChild( this.centerViewButton );

			this.compileButton = document.createElement( 'button' );
			this.compileButton.type = 'button';
		this.compileButton.className = 'shader-builder-toolbar-btn';
		this.compileButton.textContent = 'Compile';
		this.compileButton.addEventListener( 'click', () => {

			void this._compileNow();

		} );
		actionGroup.appendChild( this.compileButton );

		this.autoCompileLabel = document.createElement( 'label' );
		this.autoCompileLabel.className = 'shader-builder-auto';
		this.autoCompileCheckbox = document.createElement( 'input' );
		this.autoCompileCheckbox.type = 'checkbox';
		this.autoCompileCheckbox.checked = true;
		this.autoCompileLabel.appendChild( this.autoCompileCheckbox );
		this.autoCompileLabel.appendChild( document.createTextNode( 'Auto Compile' ) );
		actionGroup.appendChild( this.autoCompileLabel );

		toolbar.appendChild( actionGroup );
		this.root.appendChild( toolbar );

		this.blueprintView = document.createElement( 'div' );
		this.blueprintView.className = 'shader-builder-blueprint-view';

		this.paletteColumn = document.createElement( 'aside' );
		this.paletteColumn.className = 'shader-builder-palette';

		const paletteTitle = document.createElement( 'h3' );
		paletteTitle.className = 'shader-builder-palette-title';
		paletteTitle.textContent = 'Blueprint Nodes';
		this.paletteColumn.appendChild( paletteTitle );

		this.nodeTierTabs = document.createElement( 'div' );
		this.nodeTierTabs.className = 'shader-builder-node-tier-tabs';
		this.basicTierButton = document.createElement( 'button' );
		this.basicTierButton.type = 'button';
		this.basicTierButton.className = 'shader-builder-tier-btn active';
		this.basicTierButton.textContent = 'Basic';
		this.basicTierButton.addEventListener( 'click', () => this._setNodeTier( 'basic' ) );
		this.nodeTierTabs.appendChild( this.basicTierButton );

		this.advancedTierButton = document.createElement( 'button' );
		this.advancedTierButton.type = 'button';
		this.advancedTierButton.className = 'shader-builder-tier-btn';
		this.advancedTierButton.textContent = 'Advanced';
		this.advancedTierButton.addEventListener( 'click', () => this._setNodeTier( 'advanced' ) );
		this.nodeTierTabs.appendChild( this.advancedTierButton );
		this.paletteColumn.appendChild( this.nodeTierTabs );

		this.templateContainer = document.createElement( 'div' );
		this.templateContainer.className = 'shader-builder-template-chips';
		this.paletteColumn.appendChild( this.templateContainer );

		this.previewControlsSection = document.createElement( 'section' );
		this.previewControlsSection.className = 'shader-builder-ocean-controls shader-builder-preview-controls';
		const previewSectionTitle = document.createElement( 'h4' );
		previewSectionTitle.className = 'shader-builder-ocean-title';
		previewSectionTitle.textContent = 'Preview Stage';
		this.previewControlsSection.appendChild( previewSectionTitle );

		const emitPreviewPartial = ( partial ) => {

			if ( this.syncingPreviewControls ) return;
			if ( this.options.onPreviewSettingsChange ) this.options.onPreviewSettingsChange( partial );

		};

		const createPreviewSelect = ( key, label, optionsList ) => {

			const row = document.createElement( 'label' );
			row.className = 'shader-builder-ocean-row';
			const caption = document.createElement( 'span' );
			caption.className = 'shader-builder-ocean-label';
			caption.textContent = label;
			const select = document.createElement( 'select' );
			select.className = 'shader-builder-node-select';
			for ( const optionValue of optionsList ) {

				const option = document.createElement( 'option' );
				option.value = optionValue;
				option.textContent = optionValue.charAt( 0 ).toUpperCase() + optionValue.slice( 1 );
				select.appendChild( option );

			}
			select.addEventListener( 'change', () => emitPreviewPartial( { [ key ]: select.value } ) );
			row.appendChild( caption );
			row.appendChild( select );
			this.previewControlsSection.appendChild( row );
			return select;

		};

		const createPreviewSlider = ( key, label, min, max, step ) => {

			const row = document.createElement( 'label' );
			row.className = 'shader-builder-ocean-row';
			const caption = document.createElement( 'span' );
			caption.className = 'shader-builder-ocean-label';
			caption.textContent = label;
			const valueNode = document.createElement( 'span' );
			valueNode.className = 'shader-builder-ocean-value';
			valueNode.textContent = '-';
			const input = document.createElement( 'input' );
			input.type = 'range';
			input.className = 'shader-builder-ocean-range';
			input.min = String( min );
			input.max = String( max );
			input.step = String( step );
			input.addEventListener( 'input', () => {

				const numeric = Number( input.value );
				valueNode.textContent = Number.isFinite( numeric ) ? numeric.toFixed( 2 ) : input.value;
				emitPreviewPartial( { [ key ]: numeric } );

			} );
			row.appendChild( caption );
			row.appendChild( valueNode );
			row.appendChild( input );
			this.previewControlsSection.appendChild( row );
			return { input, valueNode };

		};

		this.previewControlInputs = {
			shaderMode: createPreviewSelect( 'shaderMode', 'Shader Mode', [ 'screen', 'surface', 'volume' ] ),
			previewStage: createPreviewSelect( 'previewStage', 'Stage', [ 'plane', 'sphere', 'torus' ] ),
			lightingRig: createPreviewSelect( 'lightingRig', 'Lighting Rig', [ 'studio', 'sunset', 'night', 'neon' ] ),
			ambient: createPreviewSlider( 'ambient', 'Ambient', 0.0, 2.0, 0.01 ),
			key: createPreviewSlider( 'key', 'Key', 0.0, 2.5, 0.01 ),
			rim: createPreviewSlider( 'rim', 'Rim', 0.0, 2.0, 0.01 ),
			stageZoom: createPreviewSlider( 'stageZoom', 'Stage Zoom', 0.3, 2.5, 0.01 ),
			stageRotate: createPreviewSlider( 'stageRotate', 'Stage Rotate', - 3.14, 3.14, 0.01 ),
			volumeDensity: createPreviewSlider( 'volumeDensity', 'Volume Density', 0.1, 3.0, 0.01 ),
			volumeSteps: createPreviewSlider( 'volumeSteps', 'Volume Steps', 8.0, 36.0, 1.0 ),
			volumeStretch: createPreviewSlider( 'volumeStretch', 'Volume Stretch', 0.2, 3.0, 0.01 )
		};

		this.previewControlInputs.lightingRig.addEventListener( 'change', () => {

			if ( this.options.onApplyLightingRig ) this.options.onApplyLightingRig( this.previewControlInputs.lightingRig.value );

		} );

		const previewHint = document.createElement( 'div' );
		previewHint.className = 'shader-builder-ocean-hint';
		previewHint.textContent = 'Screen/Surface/Volume modlariyla shader sonucunu farkli sahne tiplerinde test et.';
		this.previewControlsSection.appendChild( previewHint );
		this.paletteColumn.appendChild( this.previewControlsSection );

		this.textureControlsSection = document.createElement( 'section' );
		this.textureControlsSection.className = 'shader-builder-ocean-controls shader-builder-texture-controls';
		const textureTitle = document.createElement( 'h4' );
		textureTitle.className = 'shader-builder-ocean-title';
		textureTitle.textContent = 'Texture Nodes';
		this.textureControlsSection.appendChild( textureTitle );
		this.textureStateLabels = {};

		const createTextureRow = ( slot, labelText ) => {

			const row = document.createElement( 'div' );
			row.className = 'shader-builder-texture-row';
			const label = document.createElement( 'div' );
			label.className = 'shader-builder-ocean-label';
			label.textContent = labelText;
			const nameNode = document.createElement( 'div' );
			nameNode.className = 'shader-builder-ocean-value shader-builder-texture-name';
			nameNode.textContent = 'Default';
			const actions = document.createElement( 'div' );
			actions.className = 'shader-builder-texture-actions';
			const uploadLabel = document.createElement( 'label' );
			uploadLabel.className = 'shader-builder-import-label';
			uploadLabel.textContent = 'Upload';
			const input = document.createElement( 'input' );
			input.type = 'file';
			input.accept = 'image/*';
			input.addEventListener( 'change', async () => {

				const file = input.files?.[ 0 ];
				if ( ! file || ! this.options.onTextureUpload ) return;
				await this.options.onTextureUpload( slot, file );
				input.value = '';

			} );
			uploadLabel.appendChild( input );
			const clearButton = document.createElement( 'button' );
			clearButton.type = 'button';
			clearButton.className = 'shader-builder-toolbar-btn';
			clearButton.textContent = 'Clear';
			clearButton.addEventListener( 'click', () => {

				if ( this.options.onTextureClear ) this.options.onTextureClear( slot );

			} );
			actions.appendChild( uploadLabel );
			actions.appendChild( clearButton );
			row.appendChild( label );
			row.appendChild( nameNode );
			row.appendChild( actions );
			this.textureControlsSection.appendChild( row );
			this.textureStateLabels[ slot ] = nameNode;

		};

		createTextureRow( 'a', 'Texture A' );
		createTextureRow( 'b', 'Texture B' );

		const textureHint = document.createElement( 'div' );
		textureHint.className = 'shader-builder-ocean-hint';
		textureHint.textContent = 'Texture A/B node lari ile custom image mapleri graph icinde kullanabilirsin.';
		this.textureControlsSection.appendChild( textureHint );
		this.paletteColumn.appendChild( this.textureControlsSection );

		this.oceanControlsSection = document.createElement( 'section' );
		this.oceanControlsSection.className = 'shader-builder-ocean-controls hidden';
		const oceanTitle = document.createElement( 'h4' );
		oceanTitle.className = 'shader-builder-ocean-title';
		oceanTitle.textContent = 'Ocean Pro Designer';
		this.oceanControlsSection.appendChild( oceanTitle );

		const emitOceanPartial = ( partial ) => {

			if ( this.syncingOceanControls ) return;
			if ( this.options.onOceanProParamsChange ) this.options.onOceanProParamsChange( partial );

		};

		this.oceanControlInputs = {};

		const createOceanSlider = ( key, label, min, max, step ) => {

			const row = document.createElement( 'label' );
			row.className = 'shader-builder-ocean-row';
			const caption = document.createElement( 'span' );
			caption.className = 'shader-builder-ocean-label';
			caption.textContent = label;
			const valueNode = document.createElement( 'span' );
			valueNode.className = 'shader-builder-ocean-value';
			valueNode.textContent = '-';
			const input = document.createElement( 'input' );
			input.type = 'range';
			input.className = 'shader-builder-ocean-range';
			input.min = String( min );
			input.max = String( max );
			input.step = String( step );
			input.addEventListener( 'input', () => {

				const numeric = Number( input.value );
				valueNode.textContent = Number.isFinite( numeric ) ? numeric.toFixed( 2 ) : input.value;
				emitOceanPartial( { [ key ]: numeric } );

			} );
			row.appendChild( caption );
			row.appendChild( valueNode );
			row.appendChild( input );
			this.oceanControlsSection.appendChild( row );
			this.oceanControlInputs[ key ] = { input, valueNode };

		};

		const createOceanColor = ( key, label ) => {

			const row = document.createElement( 'label' );
			row.className = 'shader-builder-ocean-row color';
			const caption = document.createElement( 'span' );
			caption.className = 'shader-builder-ocean-label';
			caption.textContent = label;
			const input = document.createElement( 'input' );
			input.type = 'color';
			input.className = 'shader-builder-ocean-color';
			input.addEventListener( 'input', () => {

				emitOceanPartial( { [ key ]: input.value } );

			} );
			row.appendChild( caption );
			row.appendChild( input );
			this.oceanControlsSection.appendChild( row );
			this.oceanControlInputs[ key ] = { input };

		};

		createOceanSlider( 'waveScale', 'Wave Scale', 0.2, 12.0, 0.05 );
		createOceanSlider( 'causticScale', 'Caustic Scale', 0.5, 20.0, 0.05 );
		createOceanSlider( 'choppy', 'Choppy', 0.0, 4.0, 0.01 );
		createOceanSlider( 'flowSpeed', 'Flow Speed', 0.05, 3.0, 0.01 );
		createOceanSlider( 'causticBoost', 'Caustic Boost', 0.2, 3.0, 0.01 );
		createOceanColor( 'deepColor', 'Deep Color' );
		createOceanColor( 'shallowColor', 'Shallow Color' );

		const nightRow = document.createElement( 'label' );
		nightRow.className = 'shader-builder-ocean-row checkbox';
		const nightInput = document.createElement( 'input' );
		nightInput.type = 'checkbox';
		nightInput.className = 'shader-builder-ocean-check';
		nightInput.addEventListener( 'change', () => {

			emitOceanPartial( { night: nightInput.checked } );

		} );
		const nightText = document.createElement( 'span' );
		nightText.className = 'shader-builder-ocean-label';
		nightText.textContent = 'Night Mode';
		nightRow.appendChild( nightInput );
		nightRow.appendChild( nightText );
		this.oceanControlsSection.appendChild( nightRow );
		this.oceanControlInputs.night = { input: nightInput };

		const oceanHint = document.createElement( 'div' );
		oceanHint.className = 'shader-builder-ocean-hint';
		oceanHint.textContent = 'Ocean Pro uses a dedicated cinematic shader pipeline.';
		this.oceanControlsSection.appendChild( oceanHint );
		this.paletteColumn.appendChild( this.oceanControlsSection );

		this.fireControlsSection = document.createElement( 'section' );
		this.fireControlsSection.className = 'shader-builder-ocean-controls shader-builder-fire-controls hidden';
		const fireTitle = document.createElement( 'h4' );
		fireTitle.className = 'shader-builder-ocean-title shader-builder-fire-title';
		fireTitle.textContent = 'Fire Pro Designer';
		this.fireControlsSection.appendChild( fireTitle );

		const emitFirePartial = ( partial ) => {

			if ( this.syncingFireControls ) return;
			if ( this.options.onFireProParamsChange ) this.options.onFireProParamsChange( partial );

		};

		this.fireControlInputs = {};

		const createFireSlider = ( key, label, min, max, step ) => {

			const row = document.createElement( 'label' );
			row.className = 'shader-builder-ocean-row';
			const caption = document.createElement( 'span' );
			caption.className = 'shader-builder-ocean-label';
			caption.textContent = label;
			const valueNode = document.createElement( 'span' );
			valueNode.className = 'shader-builder-ocean-value';
			valueNode.textContent = '-';
			const input = document.createElement( 'input' );
			input.type = 'range';
			input.className = 'shader-builder-ocean-range';
			input.min = String( min );
			input.max = String( max );
			input.step = String( step );
			input.addEventListener( 'input', () => {

				const numeric = Number( input.value );
				valueNode.textContent = Number.isFinite( numeric ) ? numeric.toFixed( 2 ) : input.value;
				emitFirePartial( { [ key ]: numeric } );

			} );
			row.appendChild( caption );
			row.appendChild( valueNode );
			row.appendChild( input );
			this.fireControlsSection.appendChild( row );
			this.fireControlInputs[ key ] = { input, valueNode };

		};

		const createFireColor = ( key, label ) => {

			const row = document.createElement( 'label' );
			row.className = 'shader-builder-ocean-row color';
			const caption = document.createElement( 'span' );
			caption.className = 'shader-builder-ocean-label';
			caption.textContent = label;
			const input = document.createElement( 'input' );
			input.type = 'color';
			input.className = 'shader-builder-ocean-color';
			input.addEventListener( 'input', () => {

				emitFirePartial( { [ key ]: input.value } );

			} );
			row.appendChild( caption );
			row.appendChild( input );
			this.fireControlsSection.appendChild( row );
			this.fireControlInputs[ key ] = { input };

		};

		createFireSlider( 'noiseScale', 'Noise Scale', 0.5, 8.0, 0.01 );
		createFireSlider( 'turbulence', 'Turbulence', 0.0, 2.0, 0.01 );
		createFireSlider( 'updraft', 'Updraft', 0.1, 3.0, 0.01 );
		createFireSlider( 'glow', 'Glow', 0.0, 2.0, 0.01 );
		createFireSlider( 'sparkAmount', 'Spark Amount', 0.0, 2.0, 0.01 );
		createFireColor( 'coreColor', 'Core Color' );
		createFireColor( 'flameColor', 'Flame Color' );
		createFireColor( 'smokeColor', 'Smoke Color' );

		const fireHint = document.createElement( 'div' );
		fireHint.className = 'shader-builder-ocean-hint';
		fireHint.textContent = 'Fire Pro uses a dedicated cinematic shader pipeline.';
		this.fireControlsSection.appendChild( fireHint );
		this.paletteColumn.appendChild( this.fireControlsSection );

		this.nodeTypeSelect = document.createElement( 'select' );
		this.nodeTypeSelect.className = 'shader-builder-node-select';
		this._refreshNodeOptions();
		this.paletteColumn.appendChild( this.nodeTypeSelect );

		this.addNodeButton = document.createElement( 'button' );
		this.addNodeButton.type = 'button';
		this.addNodeButton.className = 'shader-builder-toolbar-btn';
		this.addNodeButton.textContent = 'Add Node';
		this.addNodeButton.addEventListener( 'click', () => this._addNode() );
		this.paletteColumn.appendChild( this.addNodeButton );

		this.groupSection = document.createElement( 'section' );
		this.groupSection.className = 'shader-builder-ocean-controls';
		const groupTitle = document.createElement( 'h4' );
		groupTitle.className = 'shader-builder-ocean-title';
		groupTitle.textContent = 'Node Groups';
		this.groupSection.appendChild( groupTitle );

		const groupButtons = document.createElement( 'div' );
		groupButtons.className = 'shader-builder-inline-actions';
		this.groupCreateButton = document.createElement( 'button' );
		this.groupCreateButton.type = 'button';
		this.groupCreateButton.className = 'shader-builder-toolbar-btn';
		this.groupCreateButton.textContent = 'Create Group';
		this.groupCreateButton.addEventListener( 'click', () => this._createVisualGroupFromSelection() );
		groupButtons.appendChild( this.groupCreateButton );

		this.groupSaveButton = document.createElement( 'button' );
		this.groupSaveButton.type = 'button';
		this.groupSaveButton.className = 'shader-builder-toolbar-btn';
		this.groupSaveButton.textContent = 'Save Block';
		this.groupSaveButton.addEventListener( 'click', () => this._saveSelectedAsBlock() );
		groupButtons.appendChild( this.groupSaveButton );
		this.groupSection.appendChild( groupButtons );

		this.groupBlockSelect = document.createElement( 'select' );
		this.groupBlockSelect.className = 'shader-builder-node-select';
		this.groupSection.appendChild( this.groupBlockSelect );

		const groupBlockButtons = document.createElement( 'div' );
		groupBlockButtons.className = 'shader-builder-inline-actions';
		this.groupInsertButton = document.createElement( 'button' );
		this.groupInsertButton.type = 'button';
		this.groupInsertButton.className = 'shader-builder-toolbar-btn';
		this.groupInsertButton.textContent = 'Insert Block';
		this.groupInsertButton.addEventListener( 'click', () => this._insertSelectedBlock() );
		groupBlockButtons.appendChild( this.groupInsertButton );
		this.groupDeleteButton = document.createElement( 'button' );
		this.groupDeleteButton.type = 'button';
		this.groupDeleteButton.className = 'shader-builder-toolbar-btn';
		this.groupDeleteButton.textContent = 'Delete Block';
		this.groupDeleteButton.addEventListener( 'click', () => this._deleteSelectedBlock() );
		groupBlockButtons.appendChild( this.groupDeleteButton );
		this.groupSection.appendChild( groupBlockButtons );

		const groupHint = document.createElement( 'div' );
		groupHint.className = 'shader-builder-ocean-hint';
		groupHint.textContent = 'Secili nodelari reusable subgraph block olarak kaydet ve tekrar ekle.';
		this.groupSection.appendChild( groupHint );
		this.paletteColumn.appendChild( this.groupSection );

		this.exposedSection = document.createElement( 'section' );
		this.exposedSection.className = 'shader-builder-ocean-controls';
		const exposedTitle = document.createElement( 'h4' );
		exposedTitle.className = 'shader-builder-ocean-title';
		exposedTitle.textContent = 'Exposed Parameters';
		this.exposedSection.appendChild( exposedTitle );
		this.pinSelectedButton = document.createElement( 'button' );
		this.pinSelectedButton.type = 'button';
		this.pinSelectedButton.className = 'shader-builder-toolbar-btn';
		this.pinSelectedButton.textContent = 'Pin Selected Input';
		this.pinSelectedButton.addEventListener( 'click', () => this._pinSelectedInputs() );
		this.exposedSection.appendChild( this.pinSelectedButton );
		this.exposedList = document.createElement( 'div' );
		this.exposedList.className = 'shader-builder-exposed-list';
		this.exposedSection.appendChild( this.exposedList );
		this.paletteColumn.appendChild( this.exposedSection );

		this.timelineSection = document.createElement( 'section' );
		this.timelineSection.className = 'shader-builder-ocean-controls';
		const timelineTitle = document.createElement( 'h4' );
		timelineTitle.className = 'shader-builder-ocean-title';
		timelineTitle.textContent = 'Timeline Curves';
		this.timelineSection.appendChild( timelineTitle );
		this.timelineControls = {};

		const createTimelineCheckbox = ( key, label ) => {

			const row = document.createElement( 'label' );
			row.className = 'shader-builder-ocean-row checkbox';
			const input = document.createElement( 'input' );
			input.type = 'checkbox';
			input.className = 'shader-builder-ocean-check';
			input.addEventListener( 'change', () => {

				if ( this.options.onTimelineSettingsChange ) this.options.onTimelineSettingsChange( { [ key ]: input.checked } );

			} );
			const text = document.createElement( 'span' );
			text.className = 'shader-builder-ocean-label';
			text.textContent = label;
			row.appendChild( input );
			row.appendChild( text );
			this.timelineSection.appendChild( row );
			this.timelineControls[ key ] = { input };

		};

		const createTimelineSlider = ( key, label, min, max, step ) => {

			const row = document.createElement( 'label' );
			row.className = 'shader-builder-ocean-row';
			const caption = document.createElement( 'span' );
			caption.className = 'shader-builder-ocean-label';
			caption.textContent = label;
			const valueNode = document.createElement( 'span' );
			valueNode.className = 'shader-builder-ocean-value';
			valueNode.textContent = '-';
			const input = document.createElement( 'input' );
			input.type = 'range';
			input.className = 'shader-builder-ocean-range';
			input.min = String( min );
			input.max = String( max );
			input.step = String( step );
			input.addEventListener( 'input', () => {

				const numeric = Number( input.value );
				valueNode.textContent = Number.isFinite( numeric ) ? numeric.toFixed( 2 ) : input.value;
				if ( this.options.onTimelineSettingsChange ) this.options.onTimelineSettingsChange( { [ key ]: numeric } );
				if ( key === 'time' && this.options.onTimelineSeek ) this.options.onTimelineSeek( numeric );

			} );
			row.appendChild( caption );
			row.appendChild( valueNode );
			row.appendChild( input );
			this.timelineSection.appendChild( row );
			this.timelineControls[ key ] = { input, valueNode };

		};

		createTimelineCheckbox( 'enabled', 'Enable Timeline' );
		createTimelineCheckbox( 'playing', 'Play' );
		createTimelineCheckbox( 'loop', 'Loop' );
		createTimelineSlider( 'duration', 'Duration', 2.0, 20.0, 0.1 );
		createTimelineSlider( 'time', 'Time', 0.0, 20.0, 0.01 );

		this.timelineTrackList = document.createElement( 'div' );
		this.timelineTrackList.className = 'shader-builder-exposed-list';
		this.timelineSection.appendChild( this.timelineTrackList );
		const timelineHint = document.createElement( 'div' );
		timelineHint.className = 'shader-builder-ocean-hint';
		timelineHint.textContent = 'Float parametreleri icin 3 nokta (start/mid/end) curve animasyonu.';
		this.timelineSection.appendChild( timelineHint );
		this.paletteColumn.appendChild( this.timelineSection );

		this.retryLiteGraphButton = document.createElement( 'button' );
		this.retryLiteGraphButton.type = 'button';
		this.retryLiteGraphButton.className = 'shader-builder-toolbar-btn hidden';
		this.retryLiteGraphButton.textContent = 'Retry Graph Engine';
		this.retryLiteGraphButton.addEventListener( 'click', () => this._setupLiteGraph( true ) );
		this.paletteColumn.appendChild( this.retryLiteGraphButton );

		this.fallbackMessage = document.createElement( 'div' );
		this.fallbackMessage.className = 'shader-builder-fallback hidden';
		this.fallbackMessage.textContent = 'LiteGraph failed to load.';
		this.paletteColumn.appendChild( this.fallbackMessage );

		this.blueprintView.appendChild( this.paletteColumn );

		this.graphHost = document.createElement( 'div' );
		this.graphHost.className = 'shader-builder-graph-host';
		this.graphCanvasElement = document.createElement( 'canvas' );
		this.graphCanvasElement.className = 'shader-builder-graph-canvas';
		this.graphHost.appendChild( this.graphCanvasElement );
		this.blueprintView.appendChild( this.graphHost );

		this.root.appendChild( this.blueprintView );

		this.resultView = document.createElement( 'div' );
		this.resultView.className = 'shader-builder-result-view hidden';

		const previewPane = document.createElement( 'div' );
		previewPane.className = 'shader-builder-result-preview';
		const previewTitle = document.createElement( 'h3' );
		previewTitle.className = 'shader-builder-result-title';
		previewTitle.textContent = 'Result Preview';
		previewPane.appendChild( previewTitle );

		this.previewStatus = document.createElement( 'div' );
		this.previewStatus.className = 'shader-builder-preview-status';
		this.previewStatus.textContent = 'Ready';
		previewPane.appendChild( this.previewStatus );

		this.previewCanvas = document.createElement( 'canvas' );
		this.previewCanvas.className = 'shader-builder-preview-canvas';
		previewPane.appendChild( this.previewCanvas );
		this.resultView.appendChild( previewPane );

		const codePane = document.createElement( 'div' );
		codePane.className = 'shader-builder-result-code';
		const codeTitle = document.createElement( 'h3' );
		codeTitle.className = 'shader-builder-result-title';
		codeTitle.textContent = 'Compiled Pass Source';
		codePane.appendChild( codeTitle );

		this.resultPassTabs = document.createElement( 'div' );
		this.resultPassTabs.className = 'shader-builder-result-pass-tabs';
		this.resultTabButtons = new Map();
		const createResultTabButton = ( tabId, label ) => {

			const button = document.createElement( 'button' );
			button.type = 'button';
			button.className = 'shader-builder-result-pass-btn';
			button.textContent = label;
			button.addEventListener( 'click', () => this._setResultTab( tabId ) );
			this.resultPassTabs.appendChild( button );
			this.resultTabButtons.set( tabId, button );

		};
		createResultTabButton( 'base', 'Base GLSL' );
		createResultTabButton( 'composite', 'Composite GLSL' );
		createResultTabButton( 'postfx', 'Post FX Config' );
		codePane.appendChild( this.resultPassTabs );

		this.passStatsNode = document.createElement( 'div' );
		this.passStatsNode.className = 'shader-builder-pass-stats';
		this.passStatsNode.textContent = 'Quality: balanced | Passes: - | RT: -';
		codePane.appendChild( this.passStatsNode );

		this.glslOutputNode = document.createElement( 'textarea' );
		this.glslOutputNode.className = 'shader-builder-glsl-output';
		this.glslOutputNode.readOnly = true;
		this.glslOutputNode.spellcheck = false;
		this.glslOutputNode.value = '// Compiled GLSL will appear here.';
		codePane.appendChild( this.glslOutputNode );
		this.resultView.appendChild( codePane );

		this.root.appendChild( this.resultView );

		const persistenceRow = document.createElement( 'div' );
		persistenceRow.className = 'shader-builder-persistence-row';

		this.saveNameInput = document.createElement( 'input' );
		this.saveNameInput.type = 'text';
		this.saveNameInput.placeholder = 'Graph name';
		this.saveNameInput.className = 'shader-builder-text-input';
		persistenceRow.appendChild( this.saveNameInput );

		this.saveButton = document.createElement( 'button' );
		this.saveButton.type = 'button';
		this.saveButton.className = 'shader-builder-toolbar-btn';
		this.saveButton.textContent = 'Save';
		this.saveButton.addEventListener( 'click', () => {

			if ( this.options.onSave ) this.options.onSave( this.saveNameInput.value.trim() );

		} );
		persistenceRow.appendChild( this.saveButton );

		this.savedSelect = document.createElement( 'select' );
		this.savedSelect.className = 'shader-builder-node-select';
		persistenceRow.appendChild( this.savedSelect );

		this.loadButton = document.createElement( 'button' );
		this.loadButton.type = 'button';
		this.loadButton.className = 'shader-builder-toolbar-btn';
		this.loadButton.textContent = 'Load';
		this.loadButton.addEventListener( 'click', () => {

			const graphId = this.savedSelect.value;
			if ( graphId && this.options.onLoadSaved ) this.options.onLoadSaved( graphId );

		} );
		persistenceRow.appendChild( this.loadButton );

		this.deleteButton = document.createElement( 'button' );
		this.deleteButton.type = 'button';
		this.deleteButton.className = 'shader-builder-toolbar-btn';
		this.deleteButton.textContent = 'Delete';
		this.deleteButton.addEventListener( 'click', () => {

			const graphId = this.savedSelect.value;
			if ( graphId && this.options.onDeleteSaved ) this.options.onDeleteSaved( graphId );

		} );
		persistenceRow.appendChild( this.deleteButton );

		this.exportButton = document.createElement( 'button' );
		this.exportButton.type = 'button';
		this.exportButton.className = 'shader-builder-toolbar-btn';
		this.exportButton.textContent = 'Export JSON';
		this.exportButton.addEventListener( 'click', () => {

			if ( this.options.onExport ) this.options.onExport();

		} );
		persistenceRow.appendChild( this.exportButton );

		this.importLabel = document.createElement( 'label' );
		this.importLabel.className = 'shader-builder-import-label';
		this.importLabel.textContent = 'Import JSON';
		this.importInput = document.createElement( 'input' );
		this.importInput.type = 'file';
		this.importInput.accept = 'application/json,.json';
		this.importInput.addEventListener( 'change', async () => {

			const file = this.importInput.files?.[ 0 ];
			if ( ! file || ! this.options.onImport ) return;
			const content = await file.text();
			this.options.onImport( content );
			this.importInput.value = '';

		} );
		this.importLabel.appendChild( this.importInput );
		persistenceRow.appendChild( this.importLabel );

		this.root.appendChild( persistenceRow );

		this.messageNode = document.createElement( 'div' );
		this.messageNode.className = 'shader-builder-message';
		this.root.appendChild( this.messageNode );

		this.container.appendChild( this.root );
		this.previewContext = this.previewCanvas.getContext( '2d', { willReadFrequently: true } );
		this._setResultTab( 'base' );
		this.groupBlocks = this._loadGroupBlocks();
		this._renderGroupBlockOptions();

		this._setupLiteGraph();
		this.setView( 'blueprint' );

	}

	_setupLiteGraph( isRetry = false ) {

		if ( this.graph ) return;

		const LiteGraph = window.LiteGraph;
		if ( ! LiteGraph ) {

			this.liteGraphAvailable = false;
			this.fallbackMessage.classList.remove( 'hidden' );
			this.retryLiteGraphButton.classList.remove( 'hidden' );
			this.graphHost.classList.add( 'hidden' );
			this._setMessage( 'LiteGraph bulunamadi. Local script yuklenemedi.', true );
			return;

		}

		try {

			registerLiteGraphNodes( LiteGraph );

			this.graph = new LiteGraph.LGraph();
			this.graphCanvas = new LiteGraph.LGraphCanvas( this.graphCanvasElement, this.graph );
			this.graphCanvas.allow_dragnodes = true;
			this.graphCanvas.allow_searchbox = true;
			this.graphCanvas.ds.scale = 0.7;
			this.graph.onAfterChange = () => {

				if ( this.syncingGraph ) return;
				if ( this.autoCompileCheckbox.checked ) this._scheduleCompile();

			};
			this.graph.start();
			this.liteGraphAvailable = true;
			this.fallbackMessage.classList.add( 'hidden' );
			this.retryLiteGraphButton.classList.add( 'hidden' );
			this.graphHost.classList.remove( 'hidden' );

			if ( isRetry ) this._setMessage( 'Graph engine tekrar yuklendi.' );

		} catch ( error ) {

			this.liteGraphAvailable = false;
			this.fallbackMessage.classList.remove( 'hidden' );
			this.retryLiteGraphButton.classList.remove( 'hidden' );
			this.graphHost.classList.add( 'hidden' );
			this._setMessage( `LiteGraph init failed: ${ error.message || error }`, true );

		}

	}

	_setNodeTier( tier ) {

		const nextTier = tier === 'advanced' ? 'advanced' : 'basic';
		if ( nextTier === this.activeNodeTier ) return;
		this.activeNodeTier = nextTier;
		this.basicTierButton?.classList.toggle( 'active', nextTier === 'basic' );
		this.advancedTierButton?.classList.toggle( 'active', nextTier === 'advanced' );
		this._refreshNodeOptions();
		if ( this.state?.templates ) {

			this._renderTemplateChips( this.state.templates, this.state.activeTemplateId );

		}
		if ( this.options.onNodeTierChange ) this.options.onNodeTierChange( nextTier );

	}

	_refreshNodeOptions() {

		if ( ! this.nodeTypeSelect ) return;
		const allowedTypes = new Set( getNodeTypesByTier( this.activeNodeTier ) );
		this.nodeTypeSelect.innerHTML = '';
		for ( const category of SHADER_NODE_CATEGORIES ) {

			const types = getNodeTypesByCategory( category ).filter( ( type ) => allowedTypes.has( type ) );
			if ( types.length === 0 ) continue;

			const optGroup = document.createElement( 'optgroup' );
			optGroup.label = category;
			for ( const type of types ) {

				const option = document.createElement( 'option' );
				option.value = type;
				option.textContent = SHADER_NODE_DEFINITIONS[ type ].title;
				optGroup.appendChild( option );

			}

			this.nodeTypeSelect.appendChild( optGroup );

		}

		if ( this.nodeTypeSelect.options.length > 0 && ! this.nodeTypeSelect.value ) {

			this.nodeTypeSelect.selectedIndex = 0;

		}

	}

	_loadGroupBlocks() {

		try {

			const raw = window.localStorage?.getItem( this.groupStorageKey );
			if ( ! raw ) return [];
			const parsed = JSON.parse( raw );
			if ( ! Array.isArray( parsed ) ) return [];
			return parsed.filter( ( item ) => item && typeof item === 'object' && Array.isArray( item.nodes ) && Array.isArray( item.links ) )
				.slice( 0, 60 );

		} catch ( error ) {

			return [];

		}

	}

	_saveGroupBlocks() {

		try {

			window.localStorage?.setItem( this.groupStorageKey, JSON.stringify( this.groupBlocks.slice( 0, 60 ) ) );

		} catch ( error ) {

			// Ignore quota issues silently.

		}

	}

	_renderGroupBlockOptions() {

		if ( ! this.groupBlockSelect ) return;
		this.groupBlockSelect.innerHTML = '';
		const placeholder = document.createElement( 'option' );
		placeholder.value = '';
		placeholder.textContent = this.groupBlocks.length > 0 ? 'Saved Node Blocks' : 'No saved blocks';
		this.groupBlockSelect.appendChild( placeholder );

		for ( const block of this.groupBlocks ) {

			const option = document.createElement( 'option' );
			option.value = block.id;
			option.textContent = block.name || block.id;
			this.groupBlockSelect.appendChild( option );

		}

	}

	_getSelectedNodes() {

		if ( this.graphCanvas?.selected_nodes && typeof this.graphCanvas.selected_nodes === 'object' ) {

			const values = Object.values( this.graphCanvas.selected_nodes );
			if ( values.length > 0 ) return values;

		}

		if ( Array.isArray( this.graph?._nodes ) ) {

			return this.graph._nodes.filter( ( node ) => node?.selected === true || node?.flags?.selected === true );

		}

		return [];

	}

	_createVisualGroupFromSelection() {

		if ( ! this.graph ) return;
		const selected = this._getSelectedNodes();
		if ( selected.length === 0 ) {

			this._setMessage( 'Group olusturmak icin node sec.', true );
			return;

		}

		const minX = Math.min( ...selected.map( ( node ) => Number( node.pos?.[ 0 ] ) || 0 ) );
		const minY = Math.min( ...selected.map( ( node ) => Number( node.pos?.[ 1 ] ) || 0 ) );
		const maxX = Math.max( ...selected.map( ( node ) => ( Number( node.pos?.[ 0 ] ) || 0 ) + ( Number( node.size?.[ 0 ] ) || 180 ) ) );
		const maxY = Math.max( ...selected.map( ( node ) => ( Number( node.pos?.[ 1 ] ) || 0 ) + ( Number( node.size?.[ 1 ] ) || 90 ) ) );

		const LiteGraph = window.LiteGraph;
		if ( ! LiteGraph?.LGraphGroup ) return;
		const group = new LiteGraph.LGraphGroup( `Group ${ Date.now() % 1000 }` );
		group.pos = [ minX - 30, minY - 24 ];
		group.size = [ ( maxX - minX ) + 60, ( maxY - minY ) + 48 ];
		this.graph.add( group );
		group.recomputeInsideNodes?.();
		this._setMessage( 'Visual group olusturuldu.' );

	}

	_saveSelectedAsBlock() {

		if ( ! this.graph ) return;
		const selected = this._getSelectedNodes();
		if ( selected.length === 0 ) {

			this._setMessage( 'Block kaydetmek icin node sec.', true );
			return;

		}

		const selectedIds = new Set( selected.map( ( node ) => Number( node.id ) ) );
		const payload = this.graph.serialize();
		const nodes = ( payload.nodes || [] )
			.filter( ( node ) => selectedIds.has( Number( node.id ) ) )
			.map( ( node ) => deepClone( node ) );
		const links = ( payload.links || [] )
			.filter( ( link ) => selectedIds.has( Number( link[ 1 ] ) ) && selectedIds.has( Number( link[ 3 ] ) ) )
			.map( ( link ) => deepClone( link ) );

		if ( nodes.length === 0 ) {

			this._setMessage( 'Secilen nodelar block olarak kaydedilemedi.', true );
			return;

		}

		const suggested = this.saveNameInput?.value?.trim();
		const name = suggested || `Block ${ this.groupBlocks.length + 1 }`;
		this.groupBlocks.push( {
			id: `block_${ Date.now() }_${ Math.floor( Math.random() * 1000 ) }`,
			name,
			nodes,
			links
		} );
		this._saveGroupBlocks();
		this._renderGroupBlockOptions();
		this._setMessage( `Node block kaydedildi: ${ name }` );

	}

	_insertSelectedBlock() {

		if ( ! this.graph || ! this.groupBlockSelect?.value ) return;
		const block = this.groupBlocks.find( ( item ) => item.id === this.groupBlockSelect.value );
		if ( ! block ) return;

		const LiteGraph = window.LiteGraph;
		if ( ! LiteGraph ) return;

		const idMap = new Map();
		const createdNodes = [];
		const xOffset = 90 + Math.random() * 30;
		const yOffset = 70 + Math.random() * 30;

		for ( const source of block.nodes ) {

			const node = LiteGraph.createNode( source.type );
			if ( ! node ) continue;
			node.configure?.( deepClone( source ) );
			node.id = null;
			if ( Array.isArray( node.inputs ) ) {

				for ( const input of node.inputs ) input.link = null;

			}
			if ( Array.isArray( node.outputs ) ) {

				for ( const output of node.outputs ) output.links = [];

			}
			node.pos = [
				( Number( source.pos?.[ 0 ] ) || 120 ) + xOffset,
				( Number( source.pos?.[ 1 ] ) || 120 ) + yOffset
			];
			this.graph.add( node );
			createdNodes.push( node );
			idMap.set( Number( source.id ), node );

		}

		for ( const link of block.links ) {

			const origin = idMap.get( Number( link[ 1 ] ) );
			const target = idMap.get( Number( link[ 3 ] ) );
			if ( ! origin || ! target ) continue;
			try {

				origin.connect( Number( link[ 2 ] ), target, Number( link[ 4 ] ) );

			} catch ( error ) {

				// Ignore invalid connections from stale snippets.

			}

		}

		for ( const node of createdNodes ) node.select?.( true );
		this._setMessage( `Block eklendi: ${ block.name }` );
		if ( this.autoCompileCheckbox?.checked ) this._scheduleCompile();

	}

	_deleteSelectedBlock() {

		if ( ! this.groupBlockSelect?.value ) return;
		this.groupBlocks = this.groupBlocks.filter( ( item ) => item.id !== this.groupBlockSelect.value );
		this._saveGroupBlocks();
		this._renderGroupBlockOptions();
		this._setMessage( 'Node block silindi.' );

	}

	_pinSelectedInputs() {

		const selected = this._getSelectedNodes()
			.map( ( node ) => Number( node.id ) )
			.filter( Number.isFinite );
		if ( selected.length === 0 ) {

			this._setMessage( 'Pinlemek icin input node sec.', true );
			return;

		}

		const dynamic = this.state?.dynamicParams || [];
		const allowed = new Set( dynamic.map( ( item ) => Number( item.nodeId ) ) );
		const current = Array.isArray( this.state?.exposedParamIds ) ? this.state.exposedParamIds.slice() : [];
		const merged = [ ...current ];
		for ( const nodeId of selected ) {

			if ( ! allowed.has( nodeId ) ) continue;
			if ( ! merged.includes( nodeId ) ) merged.push( nodeId );

		}

		if ( this.options.onSetExposedParams ) this.options.onSetExposedParams( merged );

	}

	_syncExposedAndTimeline( state ) {

		if ( ! this.exposedList || ! this.timelineTrackList ) return;
		const dynamicParams = Array.isArray( state?.dynamicParams ) ? state.dynamicParams : [];
		const exposedIds = Array.isArray( state?.exposedParamIds ) ? state.exposedParamIds.map( Number ) : [];
		const timeline = state?.timelineState || {};

		this.exposedList.innerHTML = '';
		for ( const nodeId of exposedIds ) {

			const descriptor = dynamicParams.find( ( item ) => Number( item.nodeId ) === Number( nodeId ) );
			if ( ! descriptor ) continue;
			const row = document.createElement( 'div' );
			row.className = 'shader-builder-exposed-item';
			const label = document.createElement( 'div' );
			label.className = 'shader-builder-ocean-label';
			label.textContent = descriptor.label || `Param #${ descriptor.nodeId }`;
			row.appendChild( label );

			if ( descriptor.type === 'float' ) {

				const slider = document.createElement( 'input' );
				slider.type = 'range';
				slider.className = 'shader-builder-ocean-range';
				slider.min = '-10';
				slider.max = '10';
				slider.step = '0.01';
				slider.value = String( Number( descriptor.value ) || 0 );
				const number = document.createElement( 'input' );
				number.type = 'number';
				number.className = 'shader-builder-inline-number';
				number.step = '0.01';
				number.value = String( Number( descriptor.value ) || 0 );
				const applyValue = ( raw ) => {

					const next = Number( raw );
					if ( ! Number.isFinite( next ) ) return;
					slider.value = String( next );
					number.value = String( next );
					if ( this.options.onSetDynamicParam ) this.options.onSetDynamicParam( descriptor.nodeId, next );

				};
				slider.addEventListener( 'input', () => applyValue( slider.value ) );
				number.addEventListener( 'change', () => applyValue( number.value ) );
				row.appendChild( slider );
				row.appendChild( number );

			} else if ( descriptor.type === 'vec2' || descriptor.type === 'vec3' ) {

				const values = Array.isArray( descriptor.value ) ? descriptor.value : [];
				const count = descriptor.type === 'vec3' ? 3 : 2;
				const inputs = [];
				const wrap = document.createElement( 'div' );
				wrap.className = 'shader-builder-inline-actions';
				for ( let i = 0; i < count; i ++ ) {

					const input = document.createElement( 'input' );
					input.type = 'number';
					input.step = '0.01';
					input.className = 'shader-builder-inline-number';
					input.value = String( Number( values[ i ] ) || 0 );
					inputs.push( input );
					wrap.appendChild( input );

				}
				const applyVector = () => {

					const next = inputs.map( ( input ) => Number( input.value ) || 0 );
					if ( this.options.onSetDynamicParam ) this.options.onSetDynamicParam( descriptor.nodeId, next );

				};
				for ( const input of inputs ) input.addEventListener( 'change', applyVector );
				row.appendChild( wrap );

			}

			const unpin = document.createElement( 'button' );
			unpin.type = 'button';
			unpin.className = 'shader-builder-toolbar-btn';
			unpin.textContent = 'Unpin';
			unpin.addEventListener( 'click', () => {

				const filtered = exposedIds.filter( ( id ) => Number( id ) !== Number( descriptor.nodeId ) );
				if ( this.options.onSetExposedParams ) this.options.onSetExposedParams( filtered );

			} );
			row.appendChild( unpin );
			this.exposedList.appendChild( row );

		}

		if ( exposedIds.length === 0 ) {

			const empty = document.createElement( 'div' );
			empty.className = 'shader-builder-ocean-hint';
			empty.textContent = 'Input node secip "Pin Selected Input" ile bu panelde kontrol ac.';
			this.exposedList.appendChild( empty );

		}

		const tracks = timeline.tracks && typeof timeline.tracks === 'object' ? timeline.tracks : {};
		this.timelineTrackList.innerHTML = '';
		const exposedFloatParams = dynamicParams.filter(
			( item ) => item.type === 'float' && exposedIds.includes( Number( item.nodeId ) )
		);
		for ( const descriptor of exposedFloatParams ) {

			const track = tracks[ descriptor.nodeId ] || tracks[ String( descriptor.nodeId ) ] || {
				enabled: false,
				values: [ descriptor.value, descriptor.value, descriptor.value ]
			};
			const row = document.createElement( 'div' );
			row.className = 'shader-builder-timeline-track';
			const title = document.createElement( 'div' );
			title.className = 'shader-builder-ocean-label';
			title.textContent = descriptor.label || `Track #${ descriptor.nodeId }`;
			row.appendChild( title );
			const enabled = document.createElement( 'input' );
			enabled.type = 'checkbox';
			enabled.className = 'shader-builder-ocean-check';
			enabled.checked = track.enabled === true;
			enabled.addEventListener( 'change', () => {

				if ( this.options.onTimelineTrackChange ) this.options.onTimelineTrackChange( descriptor.nodeId, { ...track, enabled: enabled.checked } );

			} );
			row.appendChild( enabled );

			const values = Array.isArray( track.values ) ? track.values : [ descriptor.value, descriptor.value, descriptor.value ];
			const valueWrap = document.createElement( 'div' );
			valueWrap.className = 'shader-builder-inline-actions';
			const points = [ 'Start', 'Mid', 'End' ];
			const inputs = [];
			for ( let i = 0; i < 3; i ++ ) {

				const input = document.createElement( 'input' );
				input.type = 'number';
				input.step = '0.01';
				input.className = 'shader-builder-inline-number';
				input.title = points[ i ];
				input.value = String( Number( values[ i ] ) || 0 );
				inputs.push( input );
				valueWrap.appendChild( input );

			}
			const applyTrack = () => {

				const nextValues = inputs.map( ( input ) => Number( input.value ) || 0 );
				if ( this.options.onTimelineTrackChange ) this.options.onTimelineTrackChange( descriptor.nodeId, { enabled: enabled.checked, values: nextValues } );

			};
			for ( const input of inputs ) input.addEventListener( 'change', applyTrack );
			row.appendChild( valueWrap );
			this.timelineTrackList.appendChild( row );

		}

		if ( this.timelineControls?.enabled?.input ) this.timelineControls.enabled.input.checked = timeline.enabled === true;
		if ( this.timelineControls?.playing?.input ) this.timelineControls.playing.input.checked = timeline.playing === true;
		if ( this.timelineControls?.loop?.input ) this.timelineControls.loop.input.checked = timeline.loop !== false;
		if ( this.timelineControls?.duration?.input ) {

			const duration = Number( timeline.duration );
			if ( Number.isFinite( duration ) ) {

				this.timelineControls.duration.input.value = String( duration );
				this.timelineControls.duration.valueNode.textContent = duration.toFixed( 2 );

			}
			if ( this.timelineControls.time?.input ) this.timelineControls.time.input.max = this.timelineControls.duration.input.value;

		}
		if ( this.timelineControls?.time?.input ) {

			const time = Number( timeline.time );
			if ( Number.isFinite( time ) ) {

				this.timelineControls.time.input.value = String( time );
				this.timelineControls.time.valueNode.textContent = time.toFixed( 2 );

			}

		}

	}

	_scheduleCompile() {

		if ( this.compileTimer ) clearTimeout( this.compileTimer );
		this.compileTimer = setTimeout( () => {

			this.compileTimer = null;
			void this._compileNow();

		}, 180 );

	}

	_addNode() {

		if ( ! this.liteGraphAvailable || ! this.graph || ! this.graphCanvas ) return;
		const type = this.nodeTypeSelect.value;
		const LiteGraph = window.LiteGraph;
		const node = LiteGraph.createNode( type );
		if ( ! node ) {

			this._setMessage( `Node olusturulamadi: ${ type }`, true );
			return;

		}

		node.pos = [ 180 + Math.random() * 220, 110 + Math.random() * 260 ];
		this.graph.add( node );
		if ( this.autoCompileCheckbox.checked ) this._scheduleCompile();

	}

	_newBlankGraph() {

		if ( ! this.liteGraphAvailable || ! this.graph ) return;
		const blank = createBlankGraph();
		this._loadGraphIfNeeded( blank, true, true );
		void this._compileNow();
		this._setMessage( 'Blank graph hazirlandi.' );

	}

	_centerGraphView() {

		if ( ! this.graphCanvas ) return;
		const center = () => {

			if ( this.graphCanvas?.resize ) this.graphCanvas.resize();
			if ( this.graphCanvas?.focusOnGraph ) this.graphCanvas.focusOnGraph();

		};

		center();
		requestAnimationFrame( center );

	}

	_getGraphPayload() {

		if ( ! this.graph ) return null;
		return this.graph.serialize();

	}

	async _compileNow() {

		if ( ! this.options.onCompile ) return;
		const graph = this._getGraphPayload();
		if ( ! graph ) return;

		try {

			const result = await this.options.onCompile( deepClone( graph ) );
			if ( result === false ) {

				this._setMessage( 'Compile basarisiz.', true );
				this.statusBadge.textContent = 'error';

			} else {

				this.lastGraphSignature = graphSignature( graph );
				this._setMessage( 'Compile tamamlandi.' );
				this.statusBadge.textContent = 'compiled';

			}

		} catch ( error ) {

			this._setMessage( error?.message || String( error ), true );
			this.statusBadge.textContent = 'error';

		}

	}

	_setMessage( text, isError = false ) {

		if ( ! this.messageNode ) return;
		this.messageNode.textContent = text || '';
		this.messageNode.classList.toggle( 'error', isError );

	}

	_setResultTab( tabId ) {

		const next = tabId === 'composite' || tabId === 'postfx' ? tabId : 'base';
		this.activeResultTab = next;
		if ( this.resultTabButtons ) {

			for ( const [ key, button ] of this.resultTabButtons.entries() ) {

				button.classList.toggle( 'active', key === next );

			}

		}
		this._updateResultOutput();

	}

	_updateResultOutput() {

		if ( ! this.glslOutputNode ) return;
		const state = this.state || {};
		const passSources = state.compiledPassSources || {};
		const baseShader = passSources.baseFragmentShader || state.compiledFragmentShader || state.fragmentShader || '';
		const compositeShader = passSources.compositeFragmentShader || '';
		const postFxConfigText = passSources.postFxConfig || JSON.stringify( {
			postFxState: state.postFxState || null,
			passStats: state.passStats || null
		}, null, 2 );

		if ( this.activeResultTab === 'composite' ) {

			this.glslOutputNode.value = compositeShader || '// Composite shader is unavailable for this graph.';
			return;

		}

		if ( this.activeResultTab === 'postfx' ) {

			this.glslOutputNode.value = postFxConfigText || '{}';
			return;

		}

		this.glslOutputNode.value = baseShader || '// Compiled GLSL will appear here.';

	}

	_syncPreviewControls( state ) {

		const previewState = state?.previewState || null;
		if ( ! previewState || ! this.previewControlInputs ) return;

		this.syncingPreviewControls = true;
		try {

			if ( this.previewControlInputs.shaderMode ) this.previewControlInputs.shaderMode.value = previewState.shaderMode || 'screen';
			if ( this.previewControlInputs.previewStage ) this.previewControlInputs.previewStage.value = previewState.previewStage || 'plane';
			if ( this.previewControlInputs.lightingRig ) this.previewControlInputs.lightingRig.value = previewState.lightingRig || 'studio';

			const numericKeys = [ 'ambient', 'key', 'rim', 'stageZoom', 'stageRotate', 'volumeDensity', 'volumeSteps', 'volumeStretch' ];
			for ( const key of numericKeys ) {

				const control = this.previewControlInputs[ key ];
				if ( ! control?.input ) continue;
				const value = Number( previewState[ key ] );
				if ( Number.isFinite( value ) ) {

					control.input.value = String( value );
					if ( control.valueNode ) control.valueNode.textContent = value.toFixed( key === 'volumeSteps' ? 0 : 2 );

				}

			}

		} finally {

			this.syncingPreviewControls = false;

		}

		if ( this.textureStateLabels ) {

			const textureState = state?.textureState || {};
			if ( this.textureStateLabels.a ) this.textureStateLabels.a.textContent = textureState.aName || 'Default White';
			if ( this.textureStateLabels.b ) this.textureStateLabels.b.textContent = textureState.bName || 'Default Cool';

		}

	}

	_syncOceanControls( state ) {

		const oceanState = state?.oceanProState || null;
		const oceanMode = state?.activeRenderMode === 'oceanPro' && !! oceanState;
		if ( this.oceanControlsSection ) {

			this.oceanControlsSection.classList.toggle( 'hidden', ! oceanMode );

		}
		if ( ! oceanMode ) return;

		this.syncingOceanControls = true;
		try {

			const numericKeys = [ 'waveScale', 'causticScale', 'choppy', 'flowSpeed', 'causticBoost' ];
			for ( const key of numericKeys ) {

				const control = this.oceanControlInputs?.[ key ];
				if ( ! control?.input ) continue;
				const value = Number( oceanState[ key ] );
				if ( Number.isFinite( value ) ) {

					control.input.value = String( value );
					if ( control.valueNode ) control.valueNode.textContent = value.toFixed( 2 );

				}

			}

			if ( this.oceanControlInputs?.deepColor?.input && typeof oceanState.deepColor === 'string' ) {

				this.oceanControlInputs.deepColor.input.value = oceanState.deepColor;

			}

			if ( this.oceanControlInputs?.shallowColor?.input && typeof oceanState.shallowColor === 'string' ) {

				this.oceanControlInputs.shallowColor.input.value = oceanState.shallowColor;

			}

			if ( this.oceanControlInputs?.night?.input ) {

				this.oceanControlInputs.night.input.checked = oceanState.night === true;

			}

		} finally {

			this.syncingOceanControls = false;

		}

	}

	_syncFireControls( state ) {

		const fireState = state?.fireProState || null;
		const fireMode = state?.activeRenderMode === 'firePro' && !! fireState;
		if ( this.fireControlsSection ) {

			this.fireControlsSection.classList.toggle( 'hidden', ! fireMode );

		}
		if ( ! fireMode ) return;

		this.syncingFireControls = true;
		try {

			const numericKeys = [ 'noiseScale', 'turbulence', 'updraft', 'glow', 'sparkAmount' ];
			for ( const key of numericKeys ) {

				const control = this.fireControlInputs?.[ key ];
				if ( ! control?.input ) continue;
				const value = Number( fireState[ key ] );
				if ( Number.isFinite( value ) ) {

					control.input.value = String( value );
					if ( control.valueNode ) control.valueNode.textContent = value.toFixed( 2 );

				}

			}

			if ( this.fireControlInputs?.coreColor?.input && typeof fireState.coreColor === 'string' ) {

				this.fireControlInputs.coreColor.input.value = fireState.coreColor;

			}

			if ( this.fireControlInputs?.flameColor?.input && typeof fireState.flameColor === 'string' ) {

				this.fireControlInputs.flameColor.input.value = fireState.flameColor;

			}

			if ( this.fireControlInputs?.smokeColor?.input && typeof fireState.smokeColor === 'string' ) {

				this.fireControlInputs.smokeColor.input.value = fireState.smokeColor;

			}

		} finally {

			this.syncingFireControls = false;

		}

	}

	_syncSpecialModeState( state ) {

		const mode = state?.activeRenderMode || 'graph';
		const isOcean = mode === 'oceanPro';
		const isFire = mode === 'firePro';
		const isSpecial = mode !== 'graph';

		if ( this.root ) {

			this.root.classList.toggle( 'ocean-pro-mode', isOcean );
			this.root.classList.toggle( 'fire-pro-mode', isFire );

		}
		if ( this.previewControlsSection ) this.previewControlsSection.classList.toggle( 'hidden', isSpecial );
		if ( this.textureControlsSection ) this.textureControlsSection.classList.toggle( 'hidden', isSpecial );
		if ( this.groupSection ) this.groupSection.classList.toggle( 'hidden', isSpecial );
		if ( this.exposedSection ) this.exposedSection.classList.toggle( 'hidden', isSpecial );
		if ( this.timelineSection ) this.timelineSection.classList.toggle( 'hidden', isSpecial );

		if ( this.nodeTypeSelect ) this.nodeTypeSelect.disabled = isSpecial || ! this.enabled;
		if ( this.addNodeButton ) this.addNodeButton.disabled = isSpecial || ! this.enabled;
		if ( this.compileButton ) this.compileButton.disabled = isSpecial || ! this.enabled;
		if ( this.newBlankButton ) this.newBlankButton.disabled = isSpecial || ! this.enabled;
		if ( this.groupCreateButton ) this.groupCreateButton.disabled = isSpecial || ! this.enabled;
		if ( this.groupSaveButton ) this.groupSaveButton.disabled = isSpecial || ! this.enabled;
		if ( this.groupInsertButton ) this.groupInsertButton.disabled = isSpecial || ! this.enabled;
		if ( this.groupDeleteButton ) this.groupDeleteButton.disabled = isSpecial || ! this.enabled;
		if ( this.pinSelectedButton ) this.pinSelectedButton.disabled = isSpecial || ! this.enabled;

	}

	_loadGraphIfNeeded( graph, force = false, center = false ) {

		if ( ! this.liteGraphAvailable || ! this.graph || ! graph ) return;

		const nextSignature = graphSignature( graph );
		if ( ! force && ( ! nextSignature || nextSignature === this.lastGraphSignature ) ) {

			if ( center ) this._centerGraphView();
			return;

		}

		this.syncingGraph = true;
		try {

			this.graph.clear();
			this.graph.configure( deepClone( graph ) );
			this.lastGraphSignature = nextSignature;
			if ( center ) requestAnimationFrame( () => this._centerGraphView() );

		} catch ( error ) {

			this._setMessage( `Graph yuklenemedi: ${ error.message || error }`, true );

		} finally {

			this.syncingGraph = false;

		}

	}

	_renderTemplateChips( templates, activeTemplateId ) {

		this.templateContainer.innerHTML = '';
		if ( ! Array.isArray( templates ) || templates.length === 0 ) return;

		const grouped = {
			basic: templates.filter( ( item ) => item.tier !== 'advanced' ),
			advanced: templates.filter( ( item ) => item.tier === 'advanced' )
		};

		const tierOrder = this.activeNodeTier === 'advanced'
			? [ 'advanced' ]
			: [ 'basic' ];

		const labels = {
			basic: 'Basic Templates',
			advanced: 'Advanced Templates'
		};

		for ( const tier of tierOrder ) {

			const list = grouped[ tier ];
			if ( ! list || list.length === 0 ) continue;

			const section = document.createElement( 'section' );
			section.className = 'shader-template-group';

			const heading = document.createElement( 'h4' );
			heading.className = 'shader-template-group-title';
			heading.textContent = labels[ tier ];
			section.appendChild( heading );

			const listNode = document.createElement( 'div' );
			listNode.className = 'shader-template-list';

			for ( const template of list ) {

				const button = document.createElement( 'button' );
				button.type = 'button';
				button.className = 'shader-template-chip';
				button.textContent = template.name;
				button.title = template.description || template.name;
				button.classList.toggle( 'active', template.id === activeTemplateId );
				button.addEventListener( 'click', () => {

					if ( this.options.onApplyTemplate ) this.options.onApplyTemplate( template.id );

				} );
				listNode.appendChild( button );

			}

			section.appendChild( listNode );
			this.templateContainer.appendChild( section );

		}

	}

	_syncSavedGraphs( savedGraphs, activeSavedGraphId ) {

		this.savedSelect.innerHTML = '';
		const placeholder = document.createElement( 'option' );
		placeholder.value = '';
		placeholder.textContent = savedGraphs.length > 0 ? 'Saved Graphs' : 'No saved graphs';
		this.savedSelect.appendChild( placeholder );

		for ( const item of savedGraphs ) {

			const option = document.createElement( 'option' );
			option.value = item.id;
			option.textContent = item.name;
			if ( item.id === activeSavedGraphId ) option.selected = true;
			this.savedSelect.appendChild( option );

		}

		if ( activeSavedGraphId ) this.savedSelect.value = activeSavedGraphId;

	}

	_resizePreviewCanvas() {

		if ( ! this.previewCanvas ) return;
		const rect = this.previewCanvas.getBoundingClientRect();
		const width = Math.max( 2, Math.floor( rect.width ) );
		const height = Math.max( 2, Math.floor( rect.height ) );
		if ( this.previewCanvas.width !== width || this.previewCanvas.height !== height ) {

			this.previewCanvas.width = width;
			this.previewCanvas.height = height;

		}

	}

	updatePreview( sourceCanvas ) {

		if ( this.activeView !== 'result' ) return;
		if ( ! this.root || this.root.classList.contains( 'hidden' ) ) return;
		if ( ! this.previewContext || ! sourceCanvas ) return;

		this._resizePreviewCanvas();

		try {

			this.previewContext.clearRect( 0, 0, this.previewCanvas.width, this.previewCanvas.height );
			this.previewContext.drawImage( sourceCanvas, 0, 0, this.previewCanvas.width, this.previewCanvas.height );
			this.previewStatus.textContent = 'Live Preview';

		} catch ( error ) {

			this.previewStatus.textContent = 'Preview unavailable';

		}

	}

	sync( state ) {

		if ( ! this.root || ! state ) return;
		this.state = state;

		if ( state.lastError ) {

			this.statusBadge.textContent = 'error';

		} else if ( state.previewReady ) {

			this.statusBadge.textContent = 'ready';

		} else if ( state.enabled ) {

			this.statusBadge.textContent = 'active';

		} else {

			this.statusBadge.textContent = 'idle';

		}

		this._renderTemplateChips( state.templates || [], state.activeTemplateId );
		this._syncSavedGraphs( state.savedGraphs || [], state.activeSavedGraphId );
		const shouldCenterGraph =
			! this.hasCenteredInitialGraph ||
			state.activeTemplateId !== this.lastTemplateId ||
			state.activeSavedGraphId !== this.lastSavedGraphId;
		this._loadGraphIfNeeded( state.graph, false, shouldCenterGraph );
		if ( shouldCenterGraph ) this.hasCenteredInitialGraph = true;
		this.lastTemplateId = state.activeTemplateId ?? null;
		this.lastSavedGraphId = state.activeSavedGraphId ?? null;

		this._syncPreviewControls( state );
		this._syncSpecialModeState( state );
		this._syncOceanControls( state );
		this._syncFireControls( state );
		this._syncExposedAndTimeline( state );
		this._updateResultOutput();

		if ( this.passStatsNode ) {

			const stats = state.passStats || {};
			const mode = state.activeRenderMode || 'graph';
			const qualityLabel = typeof stats.qualityLabel === 'string' ? stats.qualityLabel : `tier-${ state.qualityTier ?? '-' }`;
			const passCount = Number.isFinite( stats.passCount ) ? stats.passCount : '-';
			const rtWidth = Number.isFinite( stats.lastRenderWidth ) ? stats.lastRenderWidth : '-';
			const rtHeight = Number.isFinite( stats.lastRenderHeight ) ? stats.lastRenderHeight : '-';
			this.passStatsNode.textContent = `Mode: ${ mode } | Quality: ${ qualityLabel } | Passes: ${ passCount } | RT: ${ rtWidth}x${ rtHeight }`;

		}

		if ( state.previewReady ) {

			this.previewStatus.textContent = 'Live Preview';

		} else {

			this.previewStatus.textContent = 'Compiling...';

		}

		if ( state.lastError ) this._setMessage( state.lastError, true );

	}

	setVisible( visible ) {

		if ( ! this.root ) return;
		this.root.classList.toggle( 'hidden', ! visible );

		if ( visible ) {

			if ( this.graphCanvas?.resize ) {

				requestAnimationFrame( () => this.graphCanvas.resize() );

			}

			requestAnimationFrame( () => this._resizePreviewCanvas() );

		}

	}

	setEnabled( enabled ) {

		this.enabled = enabled === true;
		if ( ! this.root ) return;

		const nodes = this.root.querySelectorAll( 'input, select, button, textarea' );
		nodes.forEach( ( node ) => {

			node.disabled = ! this.enabled;

		} );

	}

	setView( view ) {

		this.activeView = view === 'result' ? 'result' : 'blueprint';

		if ( this.blueprintView ) {

			this.blueprintView.classList.toggle( 'hidden', this.activeView !== 'blueprint' );

		}

		if ( this.resultView ) {

			this.resultView.classList.toggle( 'hidden', this.activeView !== 'result' );

		}

		if ( this.activeView === 'blueprint' && this.graphCanvas?.resize ) {

			requestAnimationFrame( () => this.graphCanvas.resize() );

		}

		if ( this.activeView === 'result' ) {

			requestAnimationFrame( () => this._resizePreviewCanvas() );

		}

	}

	dispose() {

		if ( this.compileTimer ) clearTimeout( this.compileTimer );
		this.compileTimer = null;

		if ( this.graph ) {

			this.graph.stop();
			this.graph.clear();
			this.graph = null;

		}

		if ( this.graphCanvas ) {

			this.graphCanvas.clear?.();
			this.graphCanvas = null;

		}

		if ( this.root && this.root.parentNode ) {

			this.root.parentNode.removeChild( this.root );

		}

		this.root = null;
		this.previewContext = null;

	}

}
