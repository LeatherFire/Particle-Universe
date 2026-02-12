import * as THREE from 'three/webgl';

export class CompatibilityPostProcessingManager {

	constructor( renderer, scene, camera ) {

		this.renderer = renderer;
		this.scene = scene;
		this.camera = camera;

		this.bloomStrength = { value: 0.8 };
		this.bloomThreshold = { value: 0.2 };
		this.bloomRadius = { value: 0.4 };

		this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
		this.renderer.toneMappingExposure = 1.0;

	}

	getBloomUniforms() {

		return {
			bloomStrength: this.bloomStrength,
			bloomThreshold: this.bloomThreshold,
			bloomRadius: this.bloomRadius
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
			'Neutral': THREE.NeutralToneMapping
		};

		this.renderer.toneMapping = mappings[ type ] || THREE.ACESFilmicToneMapping;

	}

	setExposure( value ) {

		this.renderer.toneMappingExposure = value;

	}

	render() {

		this.renderer.render( this.scene, this.camera );

	}

	dispose() {}

}
