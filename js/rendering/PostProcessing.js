import * as THREE from 'three/webgpu';
import { pass } from 'three/tsl';
import { bloom } from 'three/addons/tsl/display/BloomNode.js';

export class PostProcessingManager {

	constructor( renderer, scene, camera ) {

		this.renderer = renderer;
		this.scene = scene;
		this.camera = camera;

		// Create post-processing pipeline
		this.postProcessing = new THREE.PostProcessing( renderer );

		const scenePass = pass( scene, camera );
		this.scenePassColor = scenePass.getTextureNode( 'output' );

		// Bloom effect
		this.bloomPass = bloom( this.scenePassColor, 1.5, 0.0, 0.4 );

		// Compose output: scene + bloom
		this.postProcessing.outputNode = this.scenePassColor.add( this.bloomPass );

		// Set default tone mapping
		renderer.toneMapping = THREE.ACESFilmicToneMapping;
		renderer.toneMappingExposure = 1.0;

	}

	getBloomUniforms() {

		return {
			bloomStrength: this.bloomPass.strength,
			bloomThreshold: this.bloomPass.threshold,
			bloomRadius: this.bloomPass.radius,
		};

	}

	setToneMapping( type ) {

		const mappings = {
			'None': THREE.NoToneMapping,
			'Linear': THREE.LinearToneMapping,
			'Reinhard': THREE.ReinhardToneMapping,
			'Cineon': THREE.CineonToneMapping,
			'ACES': THREE.ACESFilmicToneMapping,
			'AgX': THREE.AgXToneMapping,
			'Neutral': THREE.NeutralToneMapping,
		};

		this.renderer.toneMapping = mappings[ type ] || THREE.ACESFilmicToneMapping;

	}

	setExposure( value ) {

		this.renderer.toneMappingExposure = value;

	}

	render() {

		this.postProcessing.render();

	}

	dispose() {

		if ( this.postProcessing && typeof this.postProcessing.dispose === 'function' ) {

			this.postProcessing.dispose();

		}

		this.postProcessing = null;
		this.scenePassColor = null;
		this.bloomPass = null;

	}

}

export const TONE_MAPPING_OPTIONS = [
	'None',
	'Linear',
	'Reinhard',
	'Cineon',
	'ACES',
	'AgX',
	'Neutral'
];
