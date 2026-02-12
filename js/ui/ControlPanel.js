import GUI from 'lil-gui';
import { CurveEditor } from './CurveEditor.js';
import { GradientEditor } from './GradientEditor.js';
import { PRESETS, PRESET_CATEGORIES, getPresetCategory, getPresetKeysByCategory } from '../presets/PresetLibrary.js';
import { EMITTER_SHAPES } from '../emitters/EmitterShapes.js';
import { PARTICLE_SHAPES } from '../rendering/ParticleRenderer.js';
import { TONE_MAPPING_OPTIONS } from '../rendering/PostProcessing.js';

export class ControlPanel {

	constructor( particleSystem, postProcessing, presetManager, options = {} ) {

		this.particleSystem = particleSystem;
		this.postProcessing = postProcessing;
		this.presetManager = presetManager;
		this.uniforms = particleSystem.getUniforms();
		this.bloomUniforms = postProcessing.getBloomUniforms();
		this.onPresetChange = typeof options.onPresetChange === 'function' ? options.onPresetChange : null;
		this.onShaderBuilderViewChange = typeof options.onShaderBuilderViewChange === 'function' ? options.onShaderBuilderViewChange : null;
		this.gui = null;
		this.controllers = {};
		this.activePreset = null;
		this.activeCategory = 'core';
		this.activeShaderBuilderView = 'blueprint';

		this._createPresetSelector();
		this._createGUI();
		this._createCustomWidgets();
		this._createStatusBar();
		this._setupToggle();
		this._setupKeyboard();

	}

	_createPresetSelector() {

		const container = document.getElementById( 'preset-container' );
		if ( ! container ) return;
		this.presetContainer = container;

		const tabsContainer = document.getElementById( 'preset-tabs' );
		if ( tabsContainer ) {

			tabsContainer.querySelectorAll( '.preset-tab' ).forEach( ( tabButton ) => {

				tabButton.addEventListener( 'click', () => {

					this._setPresetCategory( tabButton.dataset.category || 'core' );

				} );

			} );

		}

		this._setPresetCategory( 'core' );

	}

	_setPresetCategory( category ) {

		const nextCategory = PRESET_CATEGORIES[ category ] ? category : 'core';
		this.activeCategory = nextCategory;
		this._updateTabButtons();
		this._renderPresetButtons();

		if ( nextCategory === 'shaderBuilder' ) {

			this.activeShaderBuilderView = 'blueprint';
			if ( this.onShaderBuilderViewChange ) this.onShaderBuilderViewChange( 'blueprint' );

			const shaderKeys = getPresetKeysByCategory( 'shaderBuilder' );
			const fallbackPreset = shaderKeys[ 0 ];
			const targetPreset = shaderKeys.includes( this.activePreset ) ? this.activePreset : fallbackPreset;
			if ( targetPreset ) {

				const appliedPreset = this.presetManager.applyPreset( targetPreset );
				this.activePreset = appliedPreset;
				if ( this.onPresetChange ) this.onPresetChange( appliedPreset );
				setTimeout( () => this.syncFromPreset( appliedPreset ), 50 );

			}

		}

	}

	_updateTabButtons() {

		const tabsContainer = document.getElementById( 'preset-tabs' );
		if ( ! tabsContainer ) return;

		tabsContainer.querySelectorAll( '.preset-tab' ).forEach( ( tabButton ) => {

			const category = tabButton.dataset.category || 'core';
			tabButton.classList.toggle( 'active', category === this.activeCategory );

		} );

	}

	_renderPresetButtons() {

		if ( ! this.presetContainer ) return;
		this.presetContainer.innerHTML = '';

		if ( this.activeCategory === 'shaderBuilder' ) {

			this._renderShaderBuilderViewButtons();
			return;

		}

		const presetKeys = getPresetKeysByCategory( this.activeCategory );
		presetKeys.forEach( ( key ) => {

			const preset = PRESETS[ key ];
			if ( ! preset ) return;

			const btn = document.createElement( 'button' );
			btn.className = 'preset-btn';
			btn.dataset.preset = key;

			const iconSpan = document.createElement( 'span' );
			iconSpan.className = 'preset-icon';
			iconSpan.textContent = preset.icon;

			const nameSpan = document.createElement( 'span' );
			nameSpan.textContent = preset.name;

			btn.appendChild( iconSpan );
			btn.appendChild( nameSpan );

			btn.addEventListener( 'click', () => {

				const appliedPreset = this.presetManager.applyPreset( key );
				this.activePreset = appliedPreset;
				this._markActivePresetButton( appliedPreset );

				if ( this.onPresetChange ) this.onPresetChange( appliedPreset );

				setTimeout( () => this.syncFromPreset( appliedPreset ), 50 );

			} );

			this.presetContainer.appendChild( btn );

		} );

		this._markActivePresetButton( this.activePreset );

	}

	_renderShaderBuilderViewButtons() {

		if ( ! this.presetContainer ) return;
		this.presetContainer.innerHTML = '';

		const createViewButton = ( view, label ) => {

			const button = document.createElement( 'button' );
			button.className = 'preset-btn shader-builder-view-btn';
			button.dataset.shaderView = view;
			button.textContent = label;
			button.classList.toggle( 'active', view === this.activeShaderBuilderView );
			button.addEventListener( 'click', () => {

				this.activeShaderBuilderView = view;
				this._renderShaderBuilderViewButtons();
				if ( this.onShaderBuilderViewChange ) this.onShaderBuilderViewChange( view );

			} );
			this.presetContainer.appendChild( button );

		};

		createViewButton( 'blueprint', 'Blueprint' );
		createViewButton( 'result', 'Result' );

	}

	_markActivePresetButton( presetName ) {

		if ( ! this.presetContainer ) return;

		this.presetContainer.querySelectorAll( '.preset-btn' ).forEach( ( button ) => {

			button.classList.toggle( 'active', button.dataset.preset === presetName );

		} );

	}

	_syncCategoryForPreset( presetName ) {

		const targetCategory = getPresetCategory( presetName );
		if ( targetCategory !== this.activeCategory ) {

			this.activeCategory = targetCategory;
			this._updateTabButtons();
			this._renderPresetButtons();

		}

	}

	setShaderBuilderView( view ) {

		if ( view !== 'blueprint' && view !== 'result' ) return;
		this.activeShaderBuilderView = view;
		if ( this.activeCategory === 'shaderBuilder' ) {

			this._renderShaderBuilderViewButtons();

		}

	}

	_createGUI() {

		const container = document.getElementById( 'gui-container' );
		this.gui = new GUI( { container, autoPlace: false } );
		this.gui.title( 'Parameters' );

		const u = this.uniforms;
		const maxParticles = this.particleSystem.maxParticles || 500000;

		// ========== EMITTER ==========
		const emitterFolder = this.gui.addFolder( 'Emitter' );

		const emitterShapeMap = {};
		EMITTER_SHAPES.forEach( ( name, i ) => { emitterShapeMap[ name ] = i; } );

		this.controllers.emitterShape = emitterFolder.add( { shape: 0 }, 'shape', emitterShapeMap )
			.name( 'Shape' )
			.onChange( v => { u.emitterType.value = v; } );

		this.controllers.particleCount = emitterFolder.add(
			{ count: u.activeParticleCount.value },
			'count', 1000, maxParticles, 1000
		).name( 'Count' ).onChange( v => {

			u.activeParticleCount.value = Math.min( Math.floor( v ), maxParticles );

		} );

		this.controllers.emitterRadius = emitterFolder.add(
			u.emitterRadius, 'value', 0.01, 5.0, 0.01
		).name( 'Radius' );

		this.controllers.emitterAngle = emitterFolder.add(
			u.emitterAngle, 'value', 0.01, 2.0, 0.01
		).name( 'Cone Angle' );

		this.controllers.emitterHeight = emitterFolder.add(
			u.emitterHeight, 'value', 0.01, 5.0, 0.01
		).name( 'Height' );

		this.controllers.lifetimeMin = emitterFolder.add(
			u.lifetimeMin, 'value', 0.1, 10.0, 0.1
		).name( 'Lifetime Min' );

		this.controllers.lifetimeMax = emitterFolder.add(
			u.lifetimeMax, 'value', 0.1, 15.0, 0.1
		).name( 'Lifetime Max' );

		this.controllers.speedMin = emitterFolder.add(
			u.initialSpeedMin, 'value', 0, 20.0, 0.1
		).name( 'Speed Min' );

		this.controllers.speedMax = emitterFolder.add(
			u.initialSpeedMax, 'value', 0, 20.0, 0.1
		).name( 'Speed Max' );

		this.controllers.spread = emitterFolder.add(
			u.initialSpread, 'value', 0, 3.0, 0.01
		).name( 'Spread' );

		// ========== FORCES ==========
		const forcesFolder = this.gui.addFolder( 'Forces' );

		this.controllers.gravity = forcesFolder.add(
			u.gravityStrength, 'value', - 20, 20, 0.1
		).name( 'Gravity' );

		this.controllers.wind = forcesFolder.add(
			u.windStrength, 'value', 0, 10, 0.1
		).name( 'Wind' );

		this.controllers.windDirX = forcesFolder.add(
			{ x: u.windDirection.value.x }, 'x', - 1, 1, 0.1
		).name( 'Wind Dir X' ).onChange( v => { u.windDirection.value.x = v; } );

		this.controllers.windDirZ = forcesFolder.add(
			{ z: u.windDirection.value.z }, 'z', - 1, 1, 0.1
		).name( 'Wind Dir Z' ).onChange( v => { u.windDirection.value.z = v; } );

		this.controllers.turbulence = forcesFolder.add(
			u.turbulenceStrength, 'value', 0, 10, 0.1
		).name( 'Turbulence' );

		this.controllers.turbScale = forcesFolder.add(
			u.turbulenceScale, 'value', 0.1, 5.0, 0.1
		).name( 'Turb. Scale' );

		this.controllers.turbSpeed = forcesFolder.add(
			u.turbulenceSpeed, 'value', 0, 5.0, 0.1
		).name( 'Turb. Speed' );

			this.controllers.vortex = forcesFolder.add(
				u.vortexStrength, 'value', 0, 15, 0.1
			).name( 'Vortex' );

			this.controllers.funnelStrength = forcesFolder.add(
				u.funnelStrength, 'value', 0, 30, 0.1
			).name( 'Funnel Force' );

			this.controllers.funnelBaseRadius = forcesFolder.add(
				u.funnelBaseRadius, 'value', 0.05, 2.5, 0.01
			).name( 'Funnel Base' );

			this.controllers.funnelTopRadius = forcesFolder.add(
				u.funnelTopRadius, 'value', 0.1, 8.0, 0.01
			).name( 'Funnel Top' );

			this.controllers.funnelHeight = forcesFolder.add(
				u.funnelHeight, 'value', 0.5, 12.0, 0.1
			).name( 'Funnel Height' );

			this.controllers.attractor = forcesFolder.add(
				{ enabled: u.attractorEnabled.value > 0.5 }, 'enabled'
			).name( 'Attractor' ).onChange( v => { u.attractorEnabled.value = v ? 1.0 : 0.0; } );

		this.controllers.attractorStr = forcesFolder.add(
			u.attractorStrength, 'value', - 20, 20, 0.1
		).name( 'Attract Force' );

		this.controllers.drag = forcesFolder.add(
			u.dragCoefficient, 'value', 0, 5.0, 0.01
		).name( 'Drag' );

		// ========== APPEARANCE ==========
		const appearanceFolder = this.gui.addFolder( 'Appearance' );

		const shapeMap = {};
		PARTICLE_SHAPES.forEach( ( name, i ) => { shapeMap[ name ] = i; } );

		this.controllers.particleShape = appearanceFolder.add( { shape: 0 }, 'shape', shapeMap )
			.name( 'Shape' )
			.onChange( v => { this.particleSystem.setParticleShape( v ); } );

		const blendingMap = { 'Additive': 'additive', 'Normal': 'normal', 'Multiply': 'multiply' };
		this.controllers.blending = appearanceFolder.add( { blend: 'additive' }, 'blend', blendingMap )
			.name( 'Blending' )
			.onChange( v => { this.particleSystem.setBlending( v ); } );

		this.controllers.startSize = appearanceFolder.add(
			u.startSize, 'value', 0.005, 0.5, 0.005
		).name( 'Size' );

			this.controllers.rotationSpeed = appearanceFolder.add(
				u.rotationSpeed, 'value', - 5, 5, 0.1
			).name( 'Rotation' );

			this.controllers.alignToVelocity = appearanceFolder.add(
				{ enabled: u.alignToVelocity.value > 0.5 }, 'enabled'
			).name( 'Align Velocity' ).onChange( v => { u.alignToVelocity.value = v ? 1.0 : 0.0; } );

			this.controllers.velocityStretch = appearanceFolder.add(
				u.velocityStretch, 'value', 0, 1, 0.01
			).name( 'Streak Mix' );

			this.controllers.velocityStretchFactor = appearanceFolder.add(
				u.velocityStretchFactor, 'value', 0, 2.0, 0.01
			).name( 'Streak Speed' );

			this.controllers.velocityStretchMax = appearanceFolder.add(
				u.velocityStretchMax, 'value', 1, 20.0, 0.1
			).name( 'Streak Max' );

		// ========== POST-PROCESSING ==========
		const postFolder = this.gui.addFolder( 'Post-Processing' );

		this.controllers.bloomStrength = postFolder.add(
			this.bloomUniforms.bloomStrength, 'value', 0, 5, 0.01
		).name( 'Bloom' );

		this.controllers.bloomThreshold = postFolder.add(
			this.bloomUniforms.bloomThreshold, 'value', 0, 2, 0.01
		).name( 'Bloom Threshold' );

		this.controllers.bloomRadius = postFolder.add(
			this.bloomUniforms.bloomRadius, 'value', 0, 1, 0.01
		).name( 'Bloom Radius' );

		this.controllers.toneMapping = postFolder.add(
			{ toneMapping: 'ACES' }, 'toneMapping', TONE_MAPPING_OPTIONS
		).name( 'Tone Map' ).onChange( v => { this.postProcessing.setToneMapping( v ); } );

		this.controllers.exposure = postFolder.add(
			{ exposure: 1.0 }, 'exposure', 0.1, 5.0, 0.01
		).name( 'Exposure' ).onChange( v => { this.postProcessing.setExposure( v ); } );

		this.controllers.bgColor = postFolder.addColor(
			{ color: '#0a0a0f' }, 'color'
		).name( 'Background' ).onChange( v => {
			if ( this.particleSystem.scene && this.particleSystem.scene.background ) {
				this.particleSystem.scene.background.set( v );
			}
		} );

		forcesFolder.close();
		postFolder.close();

	}

	_createCustomWidgets() {

		this.gradientEditor = new GradientEditor(
			document.getElementById( 'gradient-editor-container' ),
			{
				defaultStops: [
					{ pos: 0.0, color: '#ffffff' },
					{ pos: 0.3, color: '#ffaa33' },
					{ pos: 0.6, color: '#ff4400' },
					{ pos: 1.0, color: '#110000' }
				],
				onChange: ( stops ) => {
					this.particleSystem.setGradient( stops );
				}
			}
		);

		this.sizeCurve = new CurveEditor(
			document.getElementById( 'size-curve-container' ),
			{
				label: 'Size',
				color: '#4ecdc4',
				defaultPoints: [
					{ x: 0, y: 0.2 },
					{ x: 0.2, y: 0.9 },
					{ x: 0.5, y: 1.0 },
					{ x: 0.8, y: 0.6 },
					{ x: 1.0, y: 0.0 }
				],
				onChange: ( values ) => {
					this.particleSystem.setSizeCurve( values );
				}
			}
		);

		this.opacityCurve = new CurveEditor(
			document.getElementById( 'opacity-curve-container' ),
			{
				label: 'Opacity',
				color: '#ffe66d',
				defaultPoints: [
					{ x: 0, y: 0 },
					{ x: 0.1, y: 1.0 },
					{ x: 0.5, y: 0.9 },
					{ x: 0.8, y: 0.4 },
					{ x: 1.0, y: 0.0 }
				],
				onChange: ( values ) => {
					this.particleSystem.setOpacityCurve( values );
				}
			}
		);

	}

	_createStatusBar() {

		this.fpsElement = document.getElementById( 'fps-value' );
		this.particleElement = document.getElementById( 'particle-value' );
		this.gpuElement = document.getElementById( 'gpu-value' );

	}

	_setupToggle() {

		const panel = document.getElementById( 'control-panel' );
		const toggleBtn = document.getElementById( 'toggle-panel' );

		toggleBtn.addEventListener( 'click', () => {

			panel.classList.toggle( 'collapsed' );
			toggleBtn.classList.toggle( 'shifted' );

		} );

	}

	_setupKeyboard() {

		document.addEventListener( 'keydown', ( e ) => {

			if ( e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' ) return;

			switch ( e.key.toLowerCase() ) {

				case 'h':
					document.getElementById( 'control-panel' ).classList.toggle( 'collapsed' );
					document.getElementById( 'toggle-panel' ).classList.toggle( 'shifted' );
					break;

			}

		} );

	}

	updateStats( fps ) {

		if ( this.fpsElement ) {

			this.fpsElement.textContent = Math.round( fps );
			this.fpsElement.style.color = fps >= 55 ? '#4ecdc4' : fps >= 30 ? '#ffe66d' : '#ff6b6b';

		}

		if ( this.particleElement ) {

			const count = this.uniforms.activeParticleCount.value;
			this.particleElement.textContent = count.toLocaleString();

		}

	}

	setGPUInfo( info ) {

		if ( this.gpuElement ) {

			this.gpuElement.textContent = info;

		}

	}

	syncFromPreset( presetName ) {

		const preset = PRESETS[ presetName ];
		if ( ! preset ) return;

		this.activePreset = presetName;
		this._syncCategoryForPreset( presetName );
		this._markActivePresetButton( presetName );

		const p = preset.params;

		try {

			if ( this.controllers.emitterShape ) {
				this.controllers.emitterShape.setValue( p.emitterShape );
			}
			if ( this.controllers.particleCount ) {
				this.controllers.particleCount.setValue( this.uniforms.activeParticleCount.value );
			}
			if ( this.controllers.emitterRadius ) {
				this.controllers.emitterRadius.setValue( p.emitterRadius );
			}
			if ( this.controllers.emitterAngle ) {
				this.controllers.emitterAngle.setValue( p.emitterAngle );
			}
			if ( this.controllers.emitterHeight ) {
				this.controllers.emitterHeight.setValue( p.emitterHeight );
			}
			if ( this.controllers.lifetimeMin ) {
				this.controllers.lifetimeMin.setValue( p.lifetimeMin );
			}
			if ( this.controllers.lifetimeMax ) {
				this.controllers.lifetimeMax.setValue( p.lifetimeMax );
			}
			if ( this.controllers.speedMin ) {
				this.controllers.speedMin.setValue( p.initialSpeedMin );
			}
			if ( this.controllers.speedMax ) {
				this.controllers.speedMax.setValue( p.initialSpeedMax );
			}
			if ( this.controllers.spread ) {
				this.controllers.spread.setValue( p.initialSpread );
			}

			if ( this.controllers.gravity ) {
				this.controllers.gravity.setValue( p.gravityStrength );
			}
			if ( this.controllers.wind ) {
				this.controllers.wind.setValue( p.windStrength );
			}
			if ( this.controllers.turbulence ) {
				this.controllers.turbulence.setValue( p.turbulenceStrength );
			}
			if ( this.controllers.turbScale ) {
				this.controllers.turbScale.setValue( p.turbulenceScale );
			}
			if ( this.controllers.turbSpeed ) {
				this.controllers.turbSpeed.setValue( p.turbulenceSpeed );
			}
			if ( this.controllers.vortex ) {
				this.controllers.vortex.setValue( p.vortexStrength );
			}
			if ( this.controllers.funnelStrength ) {
				this.controllers.funnelStrength.setValue( this.uniforms.funnelStrength.value );
			}
			if ( this.controllers.funnelBaseRadius ) {
				this.controllers.funnelBaseRadius.setValue( this.uniforms.funnelBaseRadius.value );
			}
			if ( this.controllers.funnelTopRadius ) {
				this.controllers.funnelTopRadius.setValue( this.uniforms.funnelTopRadius.value );
			}
			if ( this.controllers.funnelHeight ) {
				this.controllers.funnelHeight.setValue( this.uniforms.funnelHeight.value );
			}
			if ( this.controllers.drag ) {
				this.controllers.drag.setValue( p.dragCoefficient );
			}
			if ( this.controllers.attractor ) {
				this.controllers.attractor.setValue( p.attractorEnabled );
			}
			if ( this.controllers.attractorStr ) {
				this.controllers.attractorStr.setValue( p.attractorStrength );
			}

			if ( this.controllers.particleShape ) {
				this.controllers.particleShape.setValue( p.particleShape );
			}
			if ( this.controllers.blending ) {
				this.controllers.blending.setValue( p.blending );
			}
			if ( this.controllers.startSize ) {
				this.controllers.startSize.setValue( p.startSize );
			}
			if ( this.controllers.rotationSpeed ) {
				this.controllers.rotationSpeed.setValue( p.rotationSpeed );
			}
			if ( this.controllers.alignToVelocity ) {
				this.controllers.alignToVelocity.setValue( this.uniforms.alignToVelocity.value > 0.5 );
			}
			if ( this.controllers.velocityStretch ) {
				this.controllers.velocityStretch.setValue( this.uniforms.velocityStretch.value );
			}
			if ( this.controllers.velocityStretchFactor ) {
				this.controllers.velocityStretchFactor.setValue( this.uniforms.velocityStretchFactor.value );
			}
			if ( this.controllers.velocityStretchMax ) {
				this.controllers.velocityStretchMax.setValue( this.uniforms.velocityStretchMax.value );
			}

			if ( this.controllers.bloomStrength ) {
				this.controllers.bloomStrength.setValue( p.bloomStrength );
			}
			if ( this.controllers.bloomThreshold ) {
				this.controllers.bloomThreshold.setValue( p.bloomThreshold );
			}
			if ( this.controllers.bloomRadius ) {
				this.controllers.bloomRadius.setValue( p.bloomRadius );
			}
			if ( this.controllers.toneMapping ) {
				this.controllers.toneMapping.setValue( p.toneMapping );
			}
			if ( this.controllers.exposure ) {
				this.controllers.exposure.setValue( p.exposure );
			}
			if ( this.controllers.bgColor ) {
				this.controllers.bgColor.setValue( p.backgroundColor );
			}

		} catch ( e ) {

			console.warn( 'Error syncing UI from preset:', e );

		}

		if ( p.colorGradient && this.gradientEditor ) {

			this.gradientEditor.setStops( p.colorGradient );
			this.particleSystem.setGradient( p.colorGradient );

		}

		if ( p.sizeCurve && this.sizeCurve ) {

			this.sizeCurve.setFromArray( p.sizeCurve );
			this.particleSystem.setSizeCurve( p.sizeCurve );

		}

		if ( p.opacityCurve && this.opacityCurve ) {

			this.opacityCurve.setFromArray( p.opacityCurve );
			this.particleSystem.setOpacityCurve( p.opacityCurve );

		}

	}

}
