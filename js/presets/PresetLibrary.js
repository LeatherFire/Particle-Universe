function generateCurve( samples, fn ) {

	const arr = new Array( samples );
	for ( let i = 0; i < samples; i ++ ) {

		arr[ i ] = Math.max( 0, Math.min( 1, fn( i / ( samples - 1 ) ) ) );

	}
	return arr;

}

export const PRESETS = {

	fire: {
		name: 'Fire',
		icon: '\uD83D\uDD25',
		params: {
			particleCount: 150000,
			emitterShape: 3,
			emitterRadius: 0.4,
			emitterAngle: 0.3,
			emitterHeight: 0.15,
			emitterHalfExtents: { x: 1, y: 1, z: 1 },
			emitterMajorRadius: 1.0,
			emitterMinorRadius: 0.2,
			emitterTurns: 3,
			lifetimeMin: 0.8,
			lifetimeMax: 2.0,
			initialSpeedMin: 1.5,
			initialSpeedMax: 3.5,
			initialSpread: 0.3,
			startSize: 0.08,
			rotationSpeed: 0.5,

			gravityStrength: - 2.0,
			gravityDirectionY: - 1,
			windStrength: 0.3,
			windDirectionX: 1.0,
			windDirectionZ: 0.0,
			turbulenceStrength: 2.5,
			turbulenceScale: 1.2,
			turbulenceSpeed: 2.0,
			vortexStrength: 1.0,
			attractorEnabled: false,
			attractorStrength: 0.0,
			attractorX: 0, attractorY: 2, attractorZ: 0,
			dragCoefficient: 0.3,

			colorGradient: [
				{ pos: 0.0, color: '#ffffff' },
				{ pos: 0.1, color: '#fff7aa' },
				{ pos: 0.3, color: '#ffaa33' },
				{ pos: 0.55, color: '#ff4400' },
				{ pos: 0.8, color: '#881100' },
				{ pos: 1.0, color: '#110000' }
			],
			sizeCurve: generateCurve( 32, t => Math.sin( t * Math.PI ) * ( 1 - t * 0.5 ) ),
			opacityCurve: generateCurve( 32, t => t < 0.1 ? t * 10 : ( 1 - ( t - 0.1 ) / 0.9 ) ),

			particleShape: 0,
			blending: 'additive',

			bloomStrength: 2.0,
			bloomThreshold: 0.1,
			bloomRadius: 0.5,
			toneMapping: 'ACES',
			exposure: 1.3,
			backgroundColor: '#080208'
		}
	},

	smoke: {
		name: 'Smoke',
		icon: '\uD83C\uDF2B\uFE0F',
		params: {
			particleCount: 80000,
			emitterShape: 0,
			emitterRadius: 0.3,
			emitterAngle: 0.2,
			emitterHeight: 0.1,
			emitterHalfExtents: { x: 0.5, y: 0.1, z: 0.5 },
			emitterMajorRadius: 1.0,
			emitterMinorRadius: 0.2,
			emitterTurns: 3,
			lifetimeMin: 2.0,
			lifetimeMax: 5.0,
			initialSpeedMin: 0.8,
			initialSpeedMax: 1.8,
			initialSpread: 0.25,
			startSize: 0.12,
			rotationSpeed: 0.3,

			gravityStrength: - 1.2,
			gravityDirectionY: - 1,
			windStrength: 0.6,
			windDirectionX: 1.0,
			windDirectionZ: 0.3,
			turbulenceStrength: 3.5,
			turbulenceScale: 0.8,
			turbulenceSpeed: 0.8,
			vortexStrength: 0.5,
			attractorEnabled: false,
			attractorStrength: 0.0,
			attractorX: 0, attractorY: 3, attractorZ: 0,
			dragCoefficient: 0.8,

			colorGradient: [
				{ pos: 0.0, color: '#dddddd' },
				{ pos: 0.15, color: '#bbbbbb' },
				{ pos: 0.4, color: '#888888' },
				{ pos: 0.65, color: '#555555' },
				{ pos: 0.85, color: '#333333' },
				{ pos: 1.0, color: '#111111' }
			],
			sizeCurve: generateCurve( 32, t => t < 0.2 ? t * 5 * 0.6 : 0.6 + t * 0.4 ),
			opacityCurve: generateCurve( 32, t => {

				if ( t < 0.15 ) return t / 0.15 * 0.6;
				if ( t < 0.5 ) return 0.6;
				return 0.6 * ( 1 - ( t - 0.5 ) / 0.5 );

			} ),

			particleShape: 3,
			blending: 'normal',

			bloomStrength: 0.3,
			bloomThreshold: 0.8,
			bloomRadius: 0.2,
			toneMapping: 'ACES',
			exposure: 1.0,
			backgroundColor: '#0a0a12'
		}
	},

	magicSparkles: {
		name: 'Magic Sparkles',
		icon: '\u2728',
		params: {
			particleCount: 200000,
			emitterShape: 1,
			emitterRadius: 2.0,
			emitterAngle: 0.5,
			emitterHeight: 0.5,
			emitterHalfExtents: { x: 2, y: 2, z: 2 },
			emitterMajorRadius: 1.0,
			emitterMinorRadius: 0.2,
			emitterTurns: 3,
			lifetimeMin: 1.0,
			lifetimeMax: 3.0,
			initialSpeedMin: 0.3,
			initialSpeedMax: 1.0,
			initialSpread: 1.0,
			startSize: 0.04,
			rotationSpeed: 2.0,

			gravityStrength: 0.5,
			gravityDirectionY: - 1,
			windStrength: 0.2,
			windDirectionX: 0.5,
			windDirectionZ: 0.5,
			turbulenceStrength: 2.0,
			turbulenceScale: 1.5,
			turbulenceSpeed: 1.5,
			vortexStrength: 0.8,
			attractorEnabled: false,
			attractorStrength: 0.0,
			attractorX: 0, attractorY: 0, attractorZ: 0,
			dragCoefficient: 0.2,

			colorGradient: [
				{ pos: 0.0, color: '#00ffff' },
				{ pos: 0.2, color: '#ff00ff' },
				{ pos: 0.4, color: '#ffff00' },
				{ pos: 0.6, color: '#00ffff' },
				{ pos: 0.8, color: '#ff00ff' },
				{ pos: 1.0, color: '#00ffff' }
			],
			sizeCurve: generateCurve( 32, t => {

				const pulse = Math.sin( t * Math.PI * 4 ) * 0.3 + 0.7;
				return pulse * ( 1 - t * 0.6 );

			} ),
			opacityCurve: generateCurve( 32, t => {

				const twinkle = Math.sin( t * Math.PI * 6 ) * 0.3 + 0.7;
				return t < 0.05 ? t * 20 : twinkle * ( 1 - Math.pow( t, 2 ) );

			} ),

			particleShape: 2,
			blending: 'additive',

			bloomStrength: 2.5,
			bloomThreshold: 0.05,
			bloomRadius: 0.6,
			toneMapping: 'ACES',
			exposure: 1.2,
			backgroundColor: '#050510'
		}
	},

	tornado: {
		name: 'Tornado',
		icon: '\uD83C\uDF2A\uFE0F',
		params: {
			particleCount: 250000,
			emitterShape: 4,
			emitterRadius: 1.5,
			emitterAngle: 0.3,
			emitterHeight: 0.2,
			emitterHalfExtents: { x: 1, y: 1, z: 1 },
			emitterMajorRadius: 1.5,
			emitterMinorRadius: 0.3,
			emitterTurns: 3,
			lifetimeMin: 1.5,
			lifetimeMax: 4.0,
			initialSpeedMin: 0.5,
			initialSpeedMax: 2.0,
			initialSpread: 0.4,
			startSize: 0.05,
			rotationSpeed: 1.0,

			gravityStrength: - 3.0,
			gravityDirectionY: - 1,
			windStrength: 1.0,
			windDirectionX: 0.3,
			windDirectionZ: 0.0,
			turbulenceStrength: 4.0,
			turbulenceScale: 1.0,
			turbulenceSpeed: 2.5,
			vortexStrength: 8.0,
			attractorEnabled: false,
			attractorStrength: 0.0,
			attractorX: 0, attractorY: 3, attractorZ: 0,
			dragCoefficient: 0.15,

			colorGradient: [
				{ pos: 0.0, color: '#ddbb88' },
				{ pos: 0.2, color: '#bb8844' },
				{ pos: 0.4, color: '#996633' },
				{ pos: 0.6, color: '#775522' },
				{ pos: 0.8, color: '#553311' },
				{ pos: 1.0, color: '#221100' }
			],
			sizeCurve: generateCurve( 32, t => Math.sin( t * Math.PI ) * 0.8 + 0.2 ),
			opacityCurve: generateCurve( 32, t => {

				if ( t < 0.1 ) return t * 10 * 0.8;
				if ( t < 0.7 ) return 0.8;
				return 0.8 * ( 1 - ( t - 0.7 ) / 0.3 );

			} ),

			particleShape: 0,
			blending: 'normal',

			bloomStrength: 0.5,
			bloomThreshold: 0.6,
			bloomRadius: 0.3,
			toneMapping: 'ACES',
			exposure: 1.1,
			backgroundColor: '#0c0806'
		}
	},

	fireworks: {
		name: 'Fireworks',
		icon: '\uD83C\uDF86',
		params: {
			particleCount: 100000,
			emitterShape: 0,
			emitterRadius: 0.05,
			emitterAngle: 0.0,
			emitterHeight: 0.0,
			emitterHalfExtents: { x: 0.05, y: 0.05, z: 0.05 },
			emitterMajorRadius: 1.0,
			emitterMinorRadius: 0.2,
			emitterTurns: 3,
			lifetimeMin: 0.8,
			lifetimeMax: 2.5,
			initialSpeedMin: 8.0,
			initialSpeedMax: 15.0,
			initialSpread: 1.0,
			startSize: 0.03,
			rotationSpeed: 0.0,

			gravityStrength: 4.0,
			gravityDirectionY: - 1,
			windStrength: 0.1,
			windDirectionX: 0.5,
			windDirectionZ: 0.0,
			turbulenceStrength: 0.5,
			turbulenceScale: 2.0,
			turbulenceSpeed: 1.0,
			vortexStrength: 0.0,
			attractorEnabled: false,
			attractorStrength: 0.0,
			attractorX: 0, attractorY: 0, attractorZ: 0,
			dragCoefficient: 0.6,

			colorGradient: [
				{ pos: 0.0, color: '#ffffff' },
				{ pos: 0.1, color: '#ffffaa' },
				{ pos: 0.25, color: '#ff4444' },
				{ pos: 0.45, color: '#ff00ff' },
				{ pos: 0.65, color: '#4444ff' },
				{ pos: 0.85, color: '#00ffaa' },
				{ pos: 1.0, color: '#000000' }
			],
			sizeCurve: generateCurve( 32, t => {

				if ( t < 0.05 ) return 1.0;
				return Math.max( 0, 1.0 - Math.pow( t, 0.5 ) );

			} ),
			opacityCurve: generateCurve( 32, t => {

				if ( t < 0.02 ) return 1.0;
				return Math.pow( 1 - t, 1.5 );

			} ),

			particleShape: 4,
			blending: 'additive',

			bloomStrength: 2.5,
			bloomThreshold: 0.05,
			bloomRadius: 0.7,
			toneMapping: 'ACES',
			exposure: 1.5,
			backgroundColor: '#020208'
		}
	},

	galaxy: {
		name: 'Galaxy',
		icon: '\uD83C\uDF0C',
		params: {
			particleCount: 350000,
			emitterShape: 6,
			emitterRadius: 3.0,
			emitterAngle: 0.0,
			emitterHeight: 0.1,
			emitterHalfExtents: { x: 3, y: 0.1, z: 3 },
			emitterMajorRadius: 3.0,
			emitterMinorRadius: 0.05,
			emitterTurns: 3,
			lifetimeMin: 8.0,
			lifetimeMax: 15.0,
			initialSpeedMin: 0.1,
			initialSpeedMax: 0.3,
			initialSpread: 0.1,
			startSize: 0.02,
			rotationSpeed: 0.1,

			gravityStrength: 0.0,
			gravityDirectionY: - 1,
			windStrength: 0.0,
			windDirectionX: 0.0,
			windDirectionZ: 0.0,
			turbulenceStrength: 0.3,
			turbulenceScale: 2.0,
			turbulenceSpeed: 0.3,
			vortexStrength: 1.5,
			attractorEnabled: true,
			attractorStrength: 0.4,
			attractorX: 0, attractorY: 0, attractorZ: 0,
			dragCoefficient: 0.05,

			colorGradient: [
				{ pos: 0.0, color: '#aaccff' },
				{ pos: 0.2, color: '#6688ff' },
				{ pos: 0.4, color: '#8844dd' },
				{ pos: 0.6, color: '#dd66aa' },
				{ pos: 0.8, color: '#ffaacc' },
				{ pos: 1.0, color: '#ffffff' }
			],
			sizeCurve: generateCurve( 32, t => {

				const base = Math.sin( t * Math.PI ) * 0.6 + 0.4;
				return base;

			} ),
			opacityCurve: generateCurve( 32, t => {

				if ( t < 0.1 ) return t * 10;
				if ( t < 0.8 ) return 1.0;
				return ( 1 - t ) / 0.2;

			} ),

			particleShape: 0,
			blending: 'additive',

			bloomStrength: 1.8,
			bloomThreshold: 0.15,
			bloomRadius: 0.8,
			toneMapping: 'ACES',
			exposure: 1.4,
			backgroundColor: '#020206'
		}
	},

	snow: {
		name: 'Snow',
		icon: '\u2744\uFE0F',
		params: {
			particleCount: 100000,
			emitterShape: 2,
			emitterRadius: 1.0,
			emitterAngle: 0.0,
			emitterHeight: 0.1,
			emitterHalfExtents: { x: 5, y: 4, z: 5 },
			emitterMajorRadius: 1.0,
			emitterMinorRadius: 0.2,
			emitterTurns: 3,
			lifetimeMin: 4.0,
			lifetimeMax: 8.0,
			initialSpeedMin: 0.1,
			initialSpeedMax: 0.4,
			initialSpread: 0.2,
			startSize: 0.04,
			rotationSpeed: 0.8,

			gravityStrength: 2.0,
			gravityDirectionY: - 1,
			windStrength: 0.5,
			windDirectionX: 0.7,
			windDirectionZ: 0.3,
			turbulenceStrength: 1.0,
			turbulenceScale: 1.5,
			turbulenceSpeed: 0.5,
			vortexStrength: 0.0,
			attractorEnabled: false,
			attractorStrength: 0.0,
			attractorX: 0, attractorY: 0, attractorZ: 0,
			dragCoefficient: 0.5,

			colorGradient: [
				{ pos: 0.0, color: '#ffffff' },
				{ pos: 0.3, color: '#eeeeff' },
				{ pos: 0.6, color: '#ddeeff' },
				{ pos: 0.8, color: '#ccddff' },
				{ pos: 1.0, color: '#bbccee' }
			],
			sizeCurve: generateCurve( 32, t => {

				const wobble = Math.sin( t * Math.PI * 3 ) * 0.1 + 0.9;
				return wobble * ( t < 0.1 ? t * 10 : 1.0 );

			} ),
			opacityCurve: generateCurve( 32, t => {

				if ( t < 0.05 ) return t * 20;
				if ( t < 0.85 ) return 1.0;
				return ( 1 - t ) / 0.15;

			} ),

			particleShape: 0,
			blending: 'normal',

			bloomStrength: 0.4,
			bloomThreshold: 0.7,
			bloomRadius: 0.3,
			toneMapping: 'ACES',
			exposure: 1.0,
			backgroundColor: '#0a0c14'
		}
	},

	fireflies: {
		name: 'Fireflies',
		icon: '\uD83D\uDCA1',
		params: {
			particleCount: 30000,
			emitterShape: 2,
			emitterRadius: 1.0,
			emitterAngle: 0.0,
			emitterHeight: 0.5,
			emitterHalfExtents: { x: 4, y: 3, z: 4 },
			emitterMajorRadius: 1.0,
			emitterMinorRadius: 0.2,
			emitterTurns: 3,
			lifetimeMin: 3.0,
			lifetimeMax: 7.0,
			initialSpeedMin: 0.1,
			initialSpeedMax: 0.5,
			initialSpread: 1.0,
			startSize: 0.1,
			rotationSpeed: 0.2,

			gravityStrength: - 0.3,
			gravityDirectionY: - 1,
			windStrength: 0.15,
			windDirectionX: 0.5,
			windDirectionZ: 0.5,
			turbulenceStrength: 4.0,
			turbulenceScale: 0.6,
			turbulenceSpeed: 0.8,
			vortexStrength: 0.3,
			attractorEnabled: false,
			attractorStrength: 0.0,
			attractorX: 0, attractorY: 1, attractorZ: 0,
			dragCoefficient: 0.6,

			colorGradient: [
				{ pos: 0.0, color: '#ffee88' },
				{ pos: 0.2, color: '#ffcc44' },
				{ pos: 0.5, color: '#ffaa22' },
				{ pos: 0.7, color: '#ee8811' },
				{ pos: 0.9, color: '#cc6600' },
				{ pos: 1.0, color: '#442200' }
			],
			sizeCurve: generateCurve( 32, t => {

				const pulse = Math.pow( Math.sin( t * Math.PI * 5 ), 2 ) * 0.5 + 0.5;
				return pulse * Math.sin( t * Math.PI );

			} ),
			opacityCurve: generateCurve( 32, t => {

				const blink = Math.pow( Math.sin( t * Math.PI * 4 ), 4 );
				const envelope = Math.sin( t * Math.PI );
				return blink * envelope;

			} ),

			particleShape: 0,
			blending: 'additive',

			bloomStrength: 2.0,
			bloomThreshold: 0.1,
			bloomRadius: 0.8,
			toneMapping: 'ACES',
			exposure: 1.1,
			backgroundColor: '#040808'
		}
	},

	electric: {
		name: 'Electric',
		icon: '\u26A1',
		params: {
			particleCount: 120000,
			emitterShape: 0,
			emitterRadius: 0.1,
			emitterAngle: 0.0,
			emitterHeight: 0.05,
			emitterHalfExtents: { x: 0.1, y: 0.1, z: 0.1 },
			emitterMajorRadius: 1.0,
			emitterMinorRadius: 0.2,
			emitterTurns: 3,
			lifetimeMin: 0.3,
			lifetimeMax: 1.0,
			initialSpeedMin: 5.0,
			initialSpeedMax: 10.0,
			initialSpread: 0.8,
			startSize: 0.025,
			rotationSpeed: 5.0,

			gravityStrength: 0.5,
			gravityDirectionY: - 1,
			windStrength: 0.0,
			windDirectionX: 0.0,
			windDirectionZ: 0.0,
			turbulenceStrength: 6.0,
			turbulenceScale: 2.0,
			turbulenceSpeed: 8.0,
			vortexStrength: 0.5,
			attractorEnabled: false,
			attractorStrength: 0.0,
			attractorX: 0, attractorY: 0, attractorZ: 0,
			dragCoefficient: 0.4,

			colorGradient: [
				{ pos: 0.0, color: '#ffffff' },
				{ pos: 0.15, color: '#ccffff' },
				{ pos: 0.35, color: '#44ddff' },
				{ pos: 0.55, color: '#2288ff' },
				{ pos: 0.75, color: '#1144aa' },
				{ pos: 1.0, color: '#000822' }
			],
			sizeCurve: generateCurve( 32, t => {

				return Math.max( 0, ( 1 - t * 1.2 ) * ( 0.8 + Math.random() * 0.4 ) );

			} ),
			opacityCurve: generateCurve( 32, t => {

				if ( t < 0.05 ) return 1.0;
				return Math.pow( 1 - t, 2.0 );

			} ),

			particleShape: 4,
			blending: 'additive',

			bloomStrength: 3.0,
			bloomThreshold: 0.05,
			bloomRadius: 0.5,
			toneMapping: 'ACES',
			exposure: 1.6,
			backgroundColor: '#020210'
		}
	},

	waterfall: {
		name: 'Waterfall',
		icon: '\uD83D\uDCA7',
		params: {
			particleCount: 200000,
			emitterShape: 2,
			emitterRadius: 1.0,
			emitterAngle: 0.0,
			emitterHeight: 0.05,
			emitterHalfExtents: { x: 2.0, y: 0.1, z: 0.5 },
			emitterMajorRadius: 1.0,
			emitterMinorRadius: 0.2,
			emitterTurns: 3,
			lifetimeMin: 1.5,
			lifetimeMax: 3.5,
			initialSpeedMin: 0.5,
			initialSpeedMax: 1.5,
			initialSpread: 0.15,
			startSize: 0.04,
			rotationSpeed: 0.3,

			gravityStrength: 12.0,
			gravityDirectionY: - 1,
			windStrength: 0.2,
			windDirectionX: 0.0,
			windDirectionZ: 1.0,
			turbulenceStrength: 1.5,
			turbulenceScale: 1.0,
			turbulenceSpeed: 1.5,
			vortexStrength: 0.0,
			attractorEnabled: false,
			attractorStrength: 0.0,
			attractorX: 0, attractorY: - 3, attractorZ: 0,
			dragCoefficient: 0.1,

			colorGradient: [
				{ pos: 0.0, color: '#ffffff' },
				{ pos: 0.15, color: '#ddeeff' },
				{ pos: 0.35, color: '#aaccff' },
				{ pos: 0.55, color: '#6699ee' },
				{ pos: 0.8, color: '#3366cc' },
				{ pos: 1.0, color: '#113366' }
			],
			sizeCurve: generateCurve( 32, t => {

				if ( t < 0.1 ) return t * 10;
				return 1.0 + t * 0.5;

			} ),
			opacityCurve: generateCurve( 32, t => {

				if ( t < 0.05 ) return t * 20;
				if ( t < 0.6 ) return 0.9;
				return 0.9 * ( 1 - ( t - 0.6 ) / 0.4 );

			} ),

			particleShape: 0,
			blending: 'normal',

			bloomStrength: 0.6,
			bloomThreshold: 0.5,
			bloomRadius: 0.4,
			toneMapping: 'ACES',
			exposure: 1.1,
			backgroundColor: '#060a10'
		}
	},

	aurora: {
		name: 'Aurora',
		icon: '\uD83C\uDF0A',
		params: {
			particleCount: 150000,
			emitterShape: 4,
			emitterRadius: 3.0,
			emitterAngle: 0.0,
			emitterHeight: 0.3,
			emitterHalfExtents: { x: 4, y: 0.5, z: 2 },
			emitterMajorRadius: 3.0,
			emitterMinorRadius: 0.5,
			emitterTurns: 3,
			lifetimeMin: 4.0,
			lifetimeMax: 8.0,
			initialSpeedMin: 0.1,
			initialSpeedMax: 0.4,
			initialSpread: 0.3,
			startSize: 0.1,
			rotationSpeed: 0.1,

			gravityStrength: - 0.2,
			gravityDirectionY: - 1,
			windStrength: 0.8,
			windDirectionX: 1.0,
			windDirectionZ: 0.0,
			turbulenceStrength: 2.5,
			turbulenceScale: 0.5,
			turbulenceSpeed: 0.4,
			vortexStrength: 0.3,
			attractorEnabled: false,
			attractorStrength: 0.0,
			attractorX: 0, attractorY: 2, attractorZ: 0,
			dragCoefficient: 0.3,

			colorGradient: [
				{ pos: 0.0, color: '#22ff88' },
				{ pos: 0.2, color: '#00ffaa' },
				{ pos: 0.4, color: '#00ddcc' },
				{ pos: 0.6, color: '#22aaff' },
				{ pos: 0.8, color: '#8844dd' },
				{ pos: 1.0, color: '#440066' }
			],
			sizeCurve: generateCurve( 32, t => {

				const wave = Math.sin( t * Math.PI * 2 ) * 0.2 + 0.8;
				return wave * Math.sin( t * Math.PI );

			} ),
			opacityCurve: generateCurve( 32, t => {

				const wave = Math.sin( t * Math.PI * 3 ) * 0.15 + 0.55;
				if ( t < 0.1 ) return t * 10 * wave;
				if ( t > 0.85 ) return wave * ( 1 - t ) / 0.15;
				return wave;

			} ),

			particleShape: 0,
			blending: 'additive',

			bloomStrength: 1.5,
			bloomThreshold: 0.2,
			bloomRadius: 1.0,
			toneMapping: 'ACES',
			exposure: 1.2,
			backgroundColor: '#020810'
		}
	},

	crystalBurst: {
		name: 'Crystal Burst',
		icon: '\uD83D\uDC8E',
		params: {
			particleCount: 80000,
			emitterShape: 0,
			emitterRadius: 0.05,
			emitterAngle: 0.0,
			emitterHeight: 0.0,
			emitterHalfExtents: { x: 0.05, y: 0.05, z: 0.05 },
			emitterMajorRadius: 1.0,
			emitterMinorRadius: 0.2,
			emitterTurns: 3,
			lifetimeMin: 2.0,
			lifetimeMax: 5.0,
			initialSpeedMin: 3.0,
			initialSpeedMax: 7.0,
			initialSpread: 1.0,
			startSize: 0.05,
			rotationSpeed: 1.5,

			gravityStrength: 1.5,
			gravityDirectionY: - 1,
			windStrength: 0.0,
			windDirectionX: 0.0,
			windDirectionZ: 0.0,
			turbulenceStrength: 0.8,
			turbulenceScale: 1.5,
			turbulenceSpeed: 1.0,
			vortexStrength: 0.0,
			attractorEnabled: false,
			attractorStrength: 0.0,
			attractorX: 0, attractorY: 0, attractorZ: 0,
			dragCoefficient: 2.0,

			colorGradient: [
				{ pos: 0.0, color: '#ffffff' },
				{ pos: 0.15, color: '#aaffff' },
				{ pos: 0.3, color: '#44ddff' },
				{ pos: 0.5, color: '#dd44ff' },
				{ pos: 0.7, color: '#ffdd44' },
				{ pos: 0.85, color: '#ff44aa' },
				{ pos: 1.0, color: '#220022' }
			],
			sizeCurve: generateCurve( 32, t => {

				if ( t < 0.1 ) return t * 10;
				return Math.pow( 1 - ( t - 0.1 ) / 0.9, 0.5 );

			} ),
			opacityCurve: generateCurve( 32, t => {

				const shimmer = Math.sin( t * Math.PI * 8 ) * 0.15 + 0.85;
				return shimmer * Math.pow( 1 - t, 0.8 );

			} ),

			particleShape: 5,
			blending: 'additive',

			bloomStrength: 2.2,
			bloomThreshold: 0.1,
			bloomRadius: 0.6,
			toneMapping: 'ACES',
			exposure: 1.4,
			backgroundColor: '#040208'
		}
	},

	sakuraPetals: {
		name: 'Sakura Petals',
		icon: '\uD83C\uDF38',
		params: {
			particleCount: 60000,
			emitterShape: 2,
			emitterRadius: 1.0,
			emitterAngle: 0.0,
			emitterHeight: 0.1,
			emitterHalfExtents: { x: 6, y: 0.2, z: 6 },
			emitterMajorRadius: 1.0,
			emitterMinorRadius: 0.2,
			emitterTurns: 3,
			lifetimeMin: 5.0,
			lifetimeMax: 10.0,
			initialSpeedMin: 0.1,
			initialSpeedMax: 0.4,
			initialSpread: 0.5,
			startSize: 0.06,
			rotationSpeed: 1.2,

			gravityStrength: 1.5,
			gravityDirectionY: - 1,
			windStrength: 1.2,
			windDirectionX: 0.8,
			windDirectionZ: 0.4,
			turbulenceStrength: 1.5,
			turbulenceScale: 0.8,
			turbulenceSpeed: 0.6,
			vortexStrength: 0.2,
			attractorEnabled: false,
			attractorStrength: 0.0,
			attractorX: 0, attractorY: 0, attractorZ: 0,
			dragCoefficient: 0.8,

			colorGradient: [
				{ pos: 0.0, color: '#ffccdd' },
				{ pos: 0.2, color: '#ffaabb' },
				{ pos: 0.4, color: '#ff88aa' },
				{ pos: 0.6, color: '#ffbbcc' },
				{ pos: 0.8, color: '#ffddee' },
				{ pos: 1.0, color: '#ffffff' }
			],
			sizeCurve: generateCurve( 32, t => {

				const sway = Math.sin( t * Math.PI * 2 ) * 0.15 + 0.85;
				if ( t < 0.1 ) return t * 10 * sway;
				return sway;

			} ),
			opacityCurve: generateCurve( 32, t => {

				if ( t < 0.1 ) return t * 10;
				if ( t < 0.7 ) return 1.0;
				return ( 1 - t ) / 0.3;

			} ),

			particleShape: 0,
			blending: 'normal',

			bloomStrength: 0.5,
			bloomThreshold: 0.6,
			bloomRadius: 0.4,
			toneMapping: 'ACES',
			exposure: 1.1,
			backgroundColor: '#0a0610'
		}
	},

	portal: {
		name: 'Portal',
		icon: '\uD83C\uDF00',
		params: {
			particleCount: 200000,
			emitterShape: 4,
			emitterRadius: 1.5,
			emitterAngle: 0.0,
			emitterHeight: 0.1,
			emitterHalfExtents: { x: 1.5, y: 0.1, z: 1.5 },
			emitterMajorRadius: 1.5,
			emitterMinorRadius: 0.15,
			emitterTurns: 3,
			lifetimeMin: 1.5,
			lifetimeMax: 4.0,
			initialSpeedMin: 0.5,
			initialSpeedMax: 1.5,
			initialSpread: 0.2,
			startSize: 0.04,
			rotationSpeed: 3.0,

			gravityStrength: 0.0,
			gravityDirectionY: - 1,
			windStrength: 0.0,
			windDirectionX: 0.0,
			windDirectionZ: 0.0,
			turbulenceStrength: 1.5,
			turbulenceScale: 1.2,
			turbulenceSpeed: 2.0,
			vortexStrength: 10.0,
			attractorEnabled: true,
			attractorStrength: 3.0,
			attractorX: 0, attractorY: 0, attractorZ: 0,
			dragCoefficient: 0.2,

			colorGradient: [
				{ pos: 0.0, color: '#8822cc' },
				{ pos: 0.2, color: '#4444ff' },
				{ pos: 0.4, color: '#22ddff' },
				{ pos: 0.5, color: '#ffffff' },
				{ pos: 0.6, color: '#22ddff' },
				{ pos: 0.8, color: '#4444ff' },
				{ pos: 1.0, color: '#440088' }
			],
			sizeCurve: generateCurve( 32, t => {

				const pulse = Math.sin( t * Math.PI * 3 ) * 0.2 + 0.8;
				return pulse * Math.sin( t * Math.PI );

			} ),
			opacityCurve: generateCurve( 32, t => {

				if ( t < 0.1 ) return t * 10;
				if ( t < 0.8 ) return 0.9;
				return 0.9 * ( 1 - ( t - 0.8 ) / 0.2 );

			} ),

			particleShape: 0,
			blending: 'additive',

			bloomStrength: 2.5,
			bloomThreshold: 0.1,
			bloomRadius: 0.8,
			toneMapping: 'ACES',
			exposure: 1.3,
			backgroundColor: '#06020e'
		}
	},

	dragonBreath: {
		name: 'Dragon Breath',
		icon: '\uD83D\uDC32',
		params: {
			particleCount: 180000,
			emitterShape: 3,
			emitterRadius: 0.3,
			emitterAngle: 0.5,
			emitterHeight: 0.2,
			emitterHalfExtents: { x: 0.3, y: 0.3, z: 0.3 },
			emitterMajorRadius: 1.0,
			emitterMinorRadius: 0.2,
			emitterTurns: 3,
			lifetimeMin: 0.5,
			lifetimeMax: 1.8,
			initialSpeedMin: 6.0,
			initialSpeedMax: 12.0,
			initialSpread: 0.25,
			startSize: 0.06,
			rotationSpeed: 1.0,

			gravityStrength: - 1.0,
			gravityDirectionY: - 1,
			windStrength: 0.5,
			windDirectionX: 1.0,
			windDirectionZ: 0.0,
			turbulenceStrength: 3.0,
			turbulenceScale: 1.5,
			turbulenceSpeed: 3.0,
			vortexStrength: 1.5,
			attractorEnabled: false,
			attractorStrength: 0.0,
			attractorX: 0, attractorY: 0, attractorZ: 0,
			dragCoefficient: 0.5,

			colorGradient: [
				{ pos: 0.0, color: '#ffffff' },
				{ pos: 0.08, color: '#ffffaa' },
				{ pos: 0.2, color: '#ffcc33' },
				{ pos: 0.4, color: '#ff6600' },
				{ pos: 0.6, color: '#dd2200' },
				{ pos: 0.8, color: '#661100' },
				{ pos: 1.0, color: '#110000' }
			],
			sizeCurve: generateCurve( 32, t => {

				if ( t < 0.05 ) return t * 20;
				return ( 1 - Math.pow( t, 0.7 ) ) * 1.2;

			} ),
			opacityCurve: generateCurve( 32, t => {

				if ( t < 0.05 ) return t * 20;
				return Math.pow( 1 - t, 1.2 );

			} ),

			particleShape: 0,
			blending: 'additive',

			bloomStrength: 2.5,
			bloomThreshold: 0.08,
			bloomRadius: 0.5,
			toneMapping: 'ACES',
			exposure: 1.4,
			backgroundColor: '#080204'
		}
	},

	emberFlames: {
		name: 'Ember Flames',
		icon: '\uD83D\uDD25',
		params: {
			particleCount: 160000,
			emitterShape: 3,
			emitterRadius: 0.45,
			emitterAngle: 0.28,
			emitterHeight: 0.35,
			emitterHalfExtents: { x: 1, y: 1, z: 1 },
			emitterMajorRadius: 1.0,
			emitterMinorRadius: 0.2,
			emitterTurns: 3,
			lifetimeMin: 0.7,
			lifetimeMax: 2.2,
			initialSpeedMin: 1.8,
			initialSpeedMax: 4.2,
			initialSpread: 0.4,
			startSize: 0.07,
			rotationSpeed: 0.9,

			gravityStrength: - 2.4,
			gravityDirectionY: - 1,
			windStrength: 0.45,
			windDirectionX: 0.9,
			windDirectionZ: 0.2,
			turbulenceStrength: 2.8,
			turbulenceScale: 1.25,
			turbulenceSpeed: 2.4,
			vortexStrength: 1.6,
			attractorEnabled: false,
			attractorStrength: 0.0,
			attractorX: 0, attractorY: 2, attractorZ: 0,
			dragCoefficient: 0.28,
			funnelStrength: 6.5,
			funnelBaseRadius: 0.22,
			funnelTopRadius: 1.45,
			funnelHeight: 3.8,
			velocityStretch: 0.55,
			velocityStretchFactor: 0.65,
			velocityStretchMin: 1.0,
			velocityStretchMax: 8.5,
			alignToVelocity: true,

			colorGradient: [
				{ pos: 0.0, color: '#ffffff' },
				{ pos: 0.12, color: '#fff3b0' },
				{ pos: 0.32, color: '#ffb347' },
				{ pos: 0.58, color: '#ff6b1a' },
				{ pos: 0.8, color: '#b32a0a' },
				{ pos: 1.0, color: '#180902' }
			],
			sizeCurve: generateCurve( 32, t => {

				const bell = Math.sin( t * Math.PI ) * 0.85 + 0.15;
				return bell * ( 1 - t * 0.35 );

			} ),
			opacityCurve: generateCurve( 32, t => {

				if ( t < 0.08 ) return t * 12.5;
				return Math.pow( 1 - t, 1.05 );

			} ),

			particleShape: 4,
			blending: 'additive',

			bloomStrength: 2.2,
			bloomThreshold: 0.08,
			bloomRadius: 0.52,
			toneMapping: 'ACES',
			exposure: 1.35,
			backgroundColor: '#080309'
		}
	},

	plasmaTornado: {
		name: 'Plasma Tornado',
		icon: '\uD83C\uDF2A\uFE0F',
		params: {
			particleCount: 185000,
			emitterShape: 4,
			emitterRadius: 1.6,
			emitterAngle: 0.2,
			emitterHeight: 0.4,
			emitterHalfExtents: { x: 1, y: 1, z: 1 },
			emitterMajorRadius: 1.45,
			emitterMinorRadius: 0.25,
			emitterTurns: 3,
			lifetimeMin: 1.1,
			lifetimeMax: 2.8,
			initialSpeedMin: 2.4,
			initialSpeedMax: 7.2,
			initialSpread: 0.22,
			startSize: 0.085,
			rotationSpeed: 1.6,

			gravityStrength: - 1.9,
			gravityDirectionY: - 1,
			windStrength: 0.15,
			windDirectionX: 0.2,
			windDirectionZ: 0.1,
			turbulenceStrength: 1.8,
			turbulenceScale: 1.25,
			turbulenceSpeed: 1.6,
			vortexStrength: 16.0,
			attractorEnabled: true,
			attractorStrength: 0.8,
			attractorX: 0, attractorY: 1.8, attractorZ: 0,
			dragCoefficient: 0.07,
			funnelStrength: 22.0,
			funnelBaseRadius: 0.24,
			funnelTopRadius: 3.9,
			funnelHeight: 8.0,
			velocityStretch: 1.0,
			velocityStretchFactor: 1.15,
			velocityStretchMin: 1.0,
			velocityStretchMax: 20.0,
			alignToVelocity: true,

			colorGradient: [
				{ pos: 0.0, color: '#fff8dd' },
				{ pos: 0.18, color: '#ffd894' },
				{ pos: 0.36, color: '#ffab5f' },
				{ pos: 0.58, color: '#ff7b34' },
				{ pos: 0.8, color: '#b34217' },
				{ pos: 1.0, color: '#170702' }
			],
			sizeCurve: generateCurve( 32, t => {

				const ribbon = 0.15 + Math.sin( t * Math.PI ) * 0.85;
				return ribbon;

			} ),
			opacityCurve: generateCurve( 32, t => {

				if ( t < 0.08 ) return t * 12.5;
				if ( t < 0.72 ) return 0.92;
				return 0.92 * ( 1 - ( t - 0.72 ) / 0.28 );

			} ),

			particleShape: 4,
			blending: 'additive',

			bloomStrength: 3.2,
			bloomThreshold: 0.03,
			bloomRadius: 0.82,
			toneMapping: 'ACES',
			exposure: 1.36,
			backgroundColor: '#120402'
		}
	},

	linkedNebula: {
		name: 'Linked Nebula',
		icon: '\uD83D\uDD17',
		params: {
			particleCount: 140000,
			emitterShape: 1,
			emitterRadius: 2.2,
			emitterAngle: 0.25,
			emitterHeight: 0.5,
			emitterHalfExtents: { x: 2.2, y: 1.6, z: 2.2 },
			emitterMajorRadius: 1.0,
			emitterMinorRadius: 0.2,
			emitterTurns: 3,
			lifetimeMin: 2.6,
			lifetimeMax: 6.5,
			initialSpeedMin: 0.25,
			initialSpeedMax: 1.1,
			initialSpread: 0.9,
			startSize: 0.035,
			rotationSpeed: 0.45,

			gravityStrength: 0.15,
			gravityDirectionY: - 1,
			windStrength: 0.08,
			windDirectionX: 0.4,
			windDirectionZ: 0.2,
			turbulenceStrength: 1.8,
			turbulenceScale: 1.7,
			turbulenceSpeed: 1.1,
			vortexStrength: 0.7,
			attractorEnabled: true,
			attractorStrength: 0.9,
			attractorX: 0, attractorY: 0.4, attractorZ: 0,
			dragCoefficient: 0.18,
			funnelStrength: 2.5,
			funnelBaseRadius: 0.8,
			funnelTopRadius: 2.8,
			funnelHeight: 6.0,
			velocityStretch: 0.35,
			velocityStretchFactor: 0.45,
			velocityStretchMin: 1.0,
			velocityStretchMax: 5.5,
			alignToVelocity: false,

			colorGradient: [
				{ pos: 0.0, color: '#f6fdff' },
				{ pos: 0.22, color: '#a4ebff' },
				{ pos: 0.44, color: '#78c1ff' },
				{ pos: 0.64, color: '#8a8fff' },
				{ pos: 0.84, color: '#d07dff' },
				{ pos: 1.0, color: '#1a0f2f' }
			],
			sizeCurve: generateCurve( 32, t => {

				const pulse = Math.sin( t * Math.PI * 2.6 ) * 0.1 + 0.9;
				return pulse * ( 1 - t * 0.25 );

			} ),
			opacityCurve: generateCurve( 32, t => {

				if ( t < 0.12 ) return t * 8.33;
				if ( t < 0.78 ) return 0.88;
				return 0.88 * ( 1 - ( t - 0.78 ) / 0.22 );

			} ),

			particleShape: 1,
			blending: 'additive',

			bloomStrength: 1.9,
			bloomThreshold: 0.14,
			bloomRadius: 0.65,
			toneMapping: 'ACES',
			exposure: 1.24,
			backgroundColor: '#030510'
		}
	},

	arcPulse: {
		name: 'Arc Pulse',
		icon: '\u26A1',
		params: {
			particleCount: 120000,
			emitterShape: 0,
			emitterRadius: 0.05,
			emitterAngle: 0.0,
			emitterHeight: 0.0,
			emitterHalfExtents: { x: 0.05, y: 0.05, z: 0.05 },
			emitterMajorRadius: 1.0,
			emitterMinorRadius: 0.2,
			emitterTurns: 3,
			lifetimeMin: 0.35,
			lifetimeMax: 1.1,
			initialSpeedMin: 5.2,
			initialSpeedMax: 11.0,
			initialSpread: 1.35,
			startSize: 0.028,
			rotationSpeed: 2.2,

			gravityStrength: 0.8,
			gravityDirectionY: - 1,
			windStrength: 0.05,
			windDirectionX: 1.0,
			windDirectionZ: 0.0,
			turbulenceStrength: 4.6,
			turbulenceScale: 0.85,
			turbulenceSpeed: 4.0,
			vortexStrength: 0.3,
			attractorEnabled: false,
			attractorStrength: 0.0,
			attractorX: 0, attractorY: 0, attractorZ: 0,
			dragCoefficient: 0.48,
			funnelStrength: 0.0,
			funnelBaseRadius: 0.35,
			funnelTopRadius: 2.4,
			funnelHeight: 6.0,
			velocityStretch: 0.95,
			velocityStretchFactor: 1.15,
			velocityStretchMin: 1.0,
			velocityStretchMax: 14.0,
			alignToVelocity: true,

			colorGradient: [
				{ pos: 0.0, color: '#ffffff' },
				{ pos: 0.12, color: '#ccf8ff' },
				{ pos: 0.35, color: '#53c5ff' },
				{ pos: 0.55, color: '#3b84ff' },
				{ pos: 0.75, color: '#7d59ff' },
				{ pos: 1.0, color: '#09061c' }
			],
			sizeCurve: generateCurve( 32, t => {

				if ( t < 0.08 ) return 1.0;
				return Math.max( 0.1, 1.0 - Math.pow( t, 0.65 ) );

			} ),
			opacityCurve: generateCurve( 32, t => {

				if ( t < 0.04 ) return 1.0;
				return Math.pow( 1 - t, 1.35 );

			} ),

			particleShape: 4,
			blending: 'additive',

			bloomStrength: 2.8,
			bloomThreshold: 0.04,
			bloomRadius: 0.7,
			toneMapping: 'ACES',
			exposure: 1.42,
			backgroundColor: '#02040f'
		}
	},

	vortexPortal: {
		name: 'Vortex Portal',
		icon: '\uD83C\uDF00',
		params: {
			particleCount: 170000,
			emitterShape: 4,
			emitterRadius: 1.7,
			emitterAngle: 0.0,
			emitterHeight: 0.2,
			emitterHalfExtents: { x: 1.7, y: 0.2, z: 1.7 },
			emitterMajorRadius: 1.65,
			emitterMinorRadius: 0.18,
			emitterTurns: 3,
			lifetimeMin: 1.2,
			lifetimeMax: 3.4,
			initialSpeedMin: 0.7,
			initialSpeedMax: 1.9,
			initialSpread: 0.24,
			startSize: 0.042,
			rotationSpeed: 3.2,

			gravityStrength: 0.0,
			gravityDirectionY: - 1,
			windStrength: 0.0,
			windDirectionX: 0.0,
			windDirectionZ: 0.0,
			turbulenceStrength: 2.2,
			turbulenceScale: 1.25,
			turbulenceSpeed: 2.3,
			vortexStrength: 11.5,
			attractorEnabled: true,
			attractorStrength: 4.0,
			attractorX: 0, attractorY: 0, attractorZ: 0,
			dragCoefficient: 0.24,
			funnelStrength: 12.0,
			funnelBaseRadius: 0.55,
			funnelTopRadius: 3.2,
			funnelHeight: 6.8,
			velocityStretch: 0.78,
			velocityStretchFactor: 0.88,
			velocityStretchMin: 1.0,
			velocityStretchMax: 11.0,
			alignToVelocity: true,

			colorGradient: [
				{ pos: 0.0, color: '#f5e9ff' },
				{ pos: 0.2, color: '#b985ff' },
				{ pos: 0.4, color: '#6d52ff' },
				{ pos: 0.58, color: '#35d6ff' },
				{ pos: 0.78, color: '#48ffcc' },
				{ pos: 1.0, color: '#06131f' }
			],
			sizeCurve: generateCurve( 32, t => {

				const ringPulse = Math.sin( t * Math.PI * 3 ) * 0.2 + 0.8;
				return ringPulse * Math.sin( t * Math.PI );

			} ),
			opacityCurve: generateCurve( 32, t => {

				if ( t < 0.08 ) return t * 12.5;
				if ( t < 0.82 ) return 0.9;
				return 0.9 * ( 1 - ( t - 0.82 ) / 0.18 );

			} ),

			particleShape: 4,
			blending: 'additive',

			bloomStrength: 2.7,
			bloomThreshold: 0.08,
			bloomRadius: 0.85,
			toneMapping: 'ACES',
			exposure: 1.32,
			backgroundColor: '#030414'
		}
	},

	supernovaBurst: {
		name: 'Supernova Burst',
		icon: '\uD83D\uDCA5',
		params: {
			particleCount: 195000,
			emitterShape: 0,
			emitterRadius: 0.06,
			emitterAngle: 0.0,
			emitterHeight: 0.0,
			emitterHalfExtents: { x: 0.06, y: 0.06, z: 0.06 },
			emitterMajorRadius: 1.0,
			emitterMinorRadius: 0.2,
			emitterTurns: 3,
			lifetimeMin: 0.55,
			lifetimeMax: 1.9,
			initialSpeedMin: 7.5,
			initialSpeedMax: 15.0,
			initialSpread: 1.0,
			startSize: 0.032,
			rotationSpeed: 0.2,

			gravityStrength: 1.2,
			gravityDirectionY: - 1,
			windStrength: 0.15,
			windDirectionX: 0.4,
			windDirectionZ: 0.2,
			turbulenceStrength: 1.3,
			turbulenceScale: 1.8,
			turbulenceSpeed: 1.6,
			vortexStrength: 0.0,
			attractorEnabled: false,
			attractorStrength: 0.0,
			attractorX: 0, attractorY: 0, attractorZ: 0,
			dragCoefficient: 0.62,
			funnelStrength: 0.0,
			funnelBaseRadius: 0.35,
			funnelTopRadius: 2.4,
			funnelHeight: 6.0,
			velocityStretch: 0.82,
			velocityStretchFactor: 1.0,
			velocityStretchMin: 1.0,
			velocityStretchMax: 12.0,
			alignToVelocity: true,

			colorGradient: [
				{ pos: 0.0, color: '#ffffff' },
				{ pos: 0.08, color: '#fff2a6' },
				{ pos: 0.22, color: '#ffbd52' },
				{ pos: 0.45, color: '#ff5f3a' },
				{ pos: 0.68, color: '#a63cff' },
				{ pos: 1.0, color: '#06040d' }
			],
			sizeCurve: generateCurve( 32, t => {

				if ( t < 0.05 ) return 1.0;
				return Math.max( 0.05, 1.1 - Math.pow( t, 0.55 ) );

			} ),
			opacityCurve: generateCurve( 32, t => {

				if ( t < 0.05 ) return 1.0;
				return Math.pow( 1 - t, 1.25 );

			} ),

			particleShape: 5,
			blending: 'additive',

			bloomStrength: 3.0,
			bloomThreshold: 0.05,
			bloomRadius: 0.78,
			toneMapping: 'ACES',
			exposure: 1.5,
			backgroundColor: '#07020d'
		}
	},

	modelReveal: {
		name: 'Model Reveal',
		icon: '\uD83D\uDCA0',
		params: {
			particleCount: 120000,
			emitterShape: 1,
			emitterRadius: 1.1,
			emitterAngle: 0.2,
			emitterHeight: 0.2,
			emitterHalfExtents: { x: 1.2, y: 1.2, z: 1.2 },
			emitterMajorRadius: 1.0,
			emitterMinorRadius: 0.2,
			emitterTurns: 3,
			lifetimeMin: 1.2,
			lifetimeMax: 3.0,
			initialSpeedMin: 0.3,
			initialSpeedMax: 1.8,
			initialSpread: 0.25,
			startSize: 0.05,
			rotationSpeed: 0.2,

			gravityStrength: - 0.3,
			gravityDirectionY: - 1,
			windStrength: 0.08,
			windDirectionX: 0.3,
			windDirectionZ: 0.1,
			turbulenceStrength: 1.0,
			turbulenceScale: 1.2,
			turbulenceSpeed: 1.0,
			vortexStrength: 0.35,
			attractorEnabled: true,
			attractorStrength: 1.2,
			attractorX: 0, attractorY: 1.6, attractorZ: 0,
			dragCoefficient: 0.35,
			funnelStrength: 0.0,
			funnelBaseRadius: 0.35,
			funnelTopRadius: 2.4,
			funnelHeight: 6.0,
			velocityStretch: 0.15,
			velocityStretchFactor: 0.45,
			velocityStretchMin: 1.0,
			velocityStretchMax: 5.0,
			alignToVelocity: false,

			colorGradient: [
				{ pos: 0.0, color: '#fff5dd' },
				{ pos: 0.25, color: '#ffd9a8' },
				{ pos: 0.5, color: '#ffad6f' },
				{ pos: 0.75, color: '#ff7a4b' },
				{ pos: 1.0, color: '#2a0903' }
			],
			sizeCurve: generateCurve( 32, t => Math.sin( t * Math.PI ) * 0.85 + 0.15 ),
			opacityCurve: generateCurve( 32, t => t < 0.15 ? t / 0.15 : Math.max( 0, 1 - ( t - 0.15 ) / 0.85 ) ),

			particleShape: 0,
			blending: 'additive',

			bloomStrength: 1.5,
			bloomThreshold: 0.15,
			bloomRadius: 0.45,
			toneMapping: 'ACES',
			exposure: 1.22,
			backgroundColor: '#06030a'
		}
	},

	modelSwarm: {
		name: 'Model Swarm',
		icon: '\uD83D\uDC1D',
		params: {
			particleCount: 160000,
			emitterShape: 5,
			emitterRadius: 1.6,
			emitterAngle: 0.3,
			emitterHeight: 0.6,
			emitterHalfExtents: { x: 1.8, y: 1.2, z: 1.8 },
			emitterMajorRadius: 1.2,
			emitterMinorRadius: 0.3,
			emitterTurns: 4,
			lifetimeMin: 1.0,
			lifetimeMax: 2.8,
			initialSpeedMin: 1.2,
			initialSpeedMax: 4.2,
			initialSpread: 0.7,
			startSize: 0.045,
			rotationSpeed: 0.9,

			gravityStrength: - 0.5,
			gravityDirectionY: - 1,
			windStrength: 0.25,
			windDirectionX: 0.5,
			windDirectionZ: 0.25,
			turbulenceStrength: 2.2,
			turbulenceScale: 1.6,
			turbulenceSpeed: 2.1,
			vortexStrength: 1.4,
			attractorEnabled: true,
			attractorStrength: 0.8,
			attractorX: 0, attractorY: 1.4, attractorZ: 0,
			dragCoefficient: 0.28,
			funnelStrength: 2.6,
			funnelBaseRadius: 0.45,
			funnelTopRadius: 1.9,
			funnelHeight: 4.8,
			velocityStretch: 0.32,
			velocityStretchFactor: 0.72,
			velocityStretchMin: 1.0,
			velocityStretchMax: 6.2,
			alignToVelocity: true,

			colorGradient: [
				{ pos: 0.0, color: '#e8fbff' },
				{ pos: 0.2, color: '#a1d9ff' },
				{ pos: 0.45, color: '#6d93ff' },
				{ pos: 0.75, color: '#4d53ff' },
				{ pos: 1.0, color: '#09071f' }
			],
			sizeCurve: generateCurve( 32, t => Math.sin( t * Math.PI ) * ( 1 - t * 0.35 ) ),
			opacityCurve: generateCurve( 32, t => t < 0.1 ? t * 8.5 : Math.pow( 1 - t, 1.15 ) ),

			particleShape: 4,
			blending: 'additive',

			bloomStrength: 1.65,
			bloomThreshold: 0.1,
			bloomRadius: 0.48,
			toneMapping: 'ACES',
			exposure: 1.18,
			backgroundColor: '#040616'
		}
	},

	modelPulse: {
		name: 'Model Pulse',
		icon: '\uD83D\uDCA1',
		params: {
			particleCount: 140000,
			emitterShape: 4,
			emitterRadius: 1.4,
			emitterAngle: 0.1,
			emitterHeight: 0.4,
			emitterHalfExtents: { x: 1.4, y: 0.9, z: 1.4 },
			emitterMajorRadius: 1.3,
			emitterMinorRadius: 0.2,
			emitterTurns: 3,
			lifetimeMin: 1.3,
			lifetimeMax: 3.3,
			initialSpeedMin: 0.8,
			initialSpeedMax: 2.8,
			initialSpread: 0.45,
			startSize: 0.055,
			rotationSpeed: 0.4,

			gravityStrength: 0.0,
			gravityDirectionY: - 1,
			windStrength: 0.15,
			windDirectionX: 0.3,
			windDirectionZ: 0.2,
			turbulenceStrength: 1.4,
			turbulenceScale: 1.3,
			turbulenceSpeed: 1.6,
			vortexStrength: 0.8,
			attractorEnabled: true,
			attractorStrength: 1.4,
			attractorX: 0, attractorY: 1.6, attractorZ: 0,
			dragCoefficient: 0.34,
			funnelStrength: 1.0,
			funnelBaseRadius: 0.4,
			funnelTopRadius: 1.7,
			funnelHeight: 4.0,
			velocityStretch: 0.22,
			velocityStretchFactor: 0.55,
			velocityStretchMin: 1.0,
			velocityStretchMax: 5.4,
			alignToVelocity: false,

			colorGradient: [
				{ pos: 0.0, color: '#ffffff' },
				{ pos: 0.22, color: '#c8f2ff' },
				{ pos: 0.48, color: '#82d6ff' },
				{ pos: 0.78, color: '#4a8bff' },
				{ pos: 1.0, color: '#070a1a' }
			],
			sizeCurve: generateCurve( 32, t => {

				const pulse = Math.sin( t * Math.PI * 2.0 ) * 0.18 + 0.82;
				return Math.max( 0.05, pulse * Math.sin( t * Math.PI ) );

			} ),
			opacityCurve: generateCurve( 32, t => {

				if ( t < 0.08 ) return t * 12;
				if ( t < 0.7 ) return 0.95;
				return Math.max( 0, 0.95 * ( 1 - ( t - 0.7 ) / 0.3 ) );

			} ),

			particleShape: 1,
			blending: 'additive',

			bloomStrength: 1.7,
			bloomThreshold: 0.09,
			bloomRadius: 0.55,
			toneMapping: 'ACES',
			exposure: 1.28,
			backgroundColor: '#030814'
		}
	},

	modelShatter: {
		name: 'Model Shatter',
		icon: '\uD83E\uDE90',
		params: {
			particleCount: 180000,
			emitterShape: 2,
			emitterRadius: 0.9,
			emitterAngle: 0.2,
			emitterHeight: 0.4,
			emitterHalfExtents: { x: 1.6, y: 1.2, z: 1.6 },
			emitterMajorRadius: 1.0,
			emitterMinorRadius: 0.25,
			emitterTurns: 4,
			lifetimeMin: 0.7,
			lifetimeMax: 2.4,
			initialSpeedMin: 2.6,
			initialSpeedMax: 6.8,
			initialSpread: 1.0,
			startSize: 0.042,
			rotationSpeed: 1.1,

			gravityStrength: 0.4,
			gravityDirectionY: - 1,
			windStrength: 0.3,
			windDirectionX: 0.7,
			windDirectionZ: 0.4,
			turbulenceStrength: 2.8,
			turbulenceScale: 2.0,
			turbulenceSpeed: 2.4,
			vortexStrength: 1.9,
			attractorEnabled: false,
			attractorStrength: 0.0,
			attractorX: 0, attractorY: 1.4, attractorZ: 0,
			dragCoefficient: 0.2,
			funnelStrength: 3.0,
			funnelBaseRadius: 0.5,
			funnelTopRadius: 2.1,
			funnelHeight: 5.0,
			velocityStretch: 0.4,
			velocityStretchFactor: 0.85,
			velocityStretchMin: 1.0,
			velocityStretchMax: 7.0,
			alignToVelocity: true,

			colorGradient: [
				{ pos: 0.0, color: '#fff1d8' },
				{ pos: 0.18, color: '#ffc993' },
				{ pos: 0.44, color: '#ff865f' },
				{ pos: 0.72, color: '#ff4d4d' },
				{ pos: 1.0, color: '#120404' }
			],
			sizeCurve: generateCurve( 32, t => Math.max( 0.05, 1.0 - Math.pow( t, 0.5 ) ) ),
			opacityCurve: generateCurve( 32, t => {

				if ( t < 0.03 ) return 1.0;
				return Math.pow( 1 - t, 1.3 );

			} ),

			particleShape: 5,
			blending: 'additive',

			bloomStrength: 1.85,
			bloomThreshold: 0.08,
			bloomRadius: 0.56,
			toneMapping: 'ACES',
			exposure: 1.3,
			backgroundColor: '#090307'
		}
	}

};

function clonePresetParams( params ) {

	return JSON.parse( JSON.stringify( params ) );

}

function buildShaderBuilderParams( overrides ) {

	const base = clonePresetParams( PRESETS.vortexPortal?.params || PRESETS.fire.params );
	return {
		...base,
		...overrides,
		colorGradient: overrides.colorGradient || base.colorGradient,
		sizeCurve: overrides.sizeCurve || base.sizeCurve,
		opacityCurve: overrides.opacityCurve || base.opacityCurve
	};

}

Object.assign( PRESETS, {
	shaderNeonTornado: {
		name: 'Neon Tornado',
		icon: '\uD83E\uDDEA',
		params: buildShaderBuilderParams( {
			particleCount: 90000,
			emitterShape: 4,
			emitterRadius: 0.45,
			emitterHeight: 0.22,
			initialSpeedMin: 1.6,
			initialSpeedMax: 4.2,
			turbulenceStrength: 2.2,
			turbulenceSpeed: 2.1,
			vortexStrength: 7.0,
			startSize: 0.07,
			bloomStrength: 1.35,
			bloomRadius: 0.5,
			exposure: 1.22,
			backgroundColor: '#070512',
			colorGradient: [
				{ pos: 0.0, color: '#82e7ff' },
				{ pos: 0.2, color: '#40a7ff' },
				{ pos: 0.5, color: '#a26cff' },
				{ pos: 0.78, color: '#ff4ecf' },
				{ pos: 1.0, color: '#16021c' }
			]
		} )
	},
	shaderSolarRings: {
		name: 'Solar Rings',
		icon: '\u2600\uFE0F',
		params: buildShaderBuilderParams( {
			particleCount: 85000,
			emitterShape: 6,
			emitterRadius: 1.5,
			emitterMajorRadius: 1.6,
			emitterMinorRadius: 0.18,
			initialSpeedMin: 1.0,
			initialSpeedMax: 3.0,
			startSize: 0.08,
			turbulenceStrength: 1.5,
			vortexStrength: 4.0,
			bloomStrength: 1.5,
			bloomRadius: 0.46,
			exposure: 1.26,
			backgroundColor: '#140803',
			colorGradient: [
				{ pos: 0.0, color: '#fff3bf' },
				{ pos: 0.2, color: '#ffd27a' },
				{ pos: 0.45, color: '#ff9247' },
				{ pos: 0.72, color: '#ff4b12' },
				{ pos: 1.0, color: '#2a0900' }
			]
		} )
	},
	shaderAuroraSheet: {
		name: 'Aurora Sheet',
		icon: '\uD83C\uDF0A',
		params: buildShaderBuilderParams( {
			particleCount: 78000,
			emitterShape: 2,
			emitterRadius: 1.1,
			emitterHalfExtents: { x: 2.8, y: 1.5, z: 2.8 },
			initialSpeedMin: 0.6,
			initialSpeedMax: 1.9,
			startSize: 0.06,
			turbulenceStrength: 1.2,
			turbulenceScale: 1.8,
			vortexStrength: 2.0,
			bloomStrength: 1.25,
			bloomRadius: 0.42,
			exposure: 1.15,
			backgroundColor: '#030912',
			colorGradient: [
				{ pos: 0.0, color: '#d8f8ff' },
				{ pos: 0.2, color: '#8ce8ff' },
				{ pos: 0.44, color: '#61ffd8' },
				{ pos: 0.72, color: '#868dff' },
				{ pos: 1.0, color: '#12072a' }
			]
		} )
	},
	shaderPlasmaWeb: {
		name: 'Plasma Web',
		icon: '\u26A1',
		params: buildShaderBuilderParams( {
			particleCount: 95000,
			emitterShape: 5,
			emitterRadius: 1.1,
			initialSpeedMin: 2.0,
			initialSpeedMax: 5.2,
			startSize: 0.06,
			turbulenceStrength: 3.0,
			turbulenceSpeed: 2.8,
			vortexStrength: 5.8,
			bloomStrength: 1.6,
			bloomRadius: 0.52,
			exposure: 1.28,
			backgroundColor: '#04020f',
			colorGradient: [
				{ pos: 0.0, color: '#ccf5ff' },
				{ pos: 0.22, color: '#77c5ff' },
				{ pos: 0.48, color: '#8f6bff' },
				{ pos: 0.74, color: '#ff4ad6' },
				{ pos: 1.0, color: '#170321' }
			]
		} )
	},
	shaderWarpTunnel: {
		name: 'Warp Tunnel',
		icon: '\uD83D\uDEF8',
		params: buildShaderBuilderParams( {
			particleCount: 92000,
			emitterShape: 4,
			emitterRadius: 0.6,
			emitterHeight: 0.35,
			initialSpeedMin: 2.0,
			initialSpeedMax: 6.2,
			startSize: 0.05,
			turbulenceStrength: 2.7,
			turbulenceScale: 0.9,
			turbulenceSpeed: 1.9,
			vortexStrength: 8.5,
			bloomStrength: 1.55,
			bloomRadius: 0.5,
			exposure: 1.25,
			backgroundColor: '#05020a',
			colorGradient: [
				{ pos: 0.0, color: '#cff8ff' },
				{ pos: 0.2, color: '#6cc4ff' },
				{ pos: 0.5, color: '#4a65ff' },
				{ pos: 0.78, color: '#fca84f' },
				{ pos: 1.0, color: '#19060d' }
			]
		} )
	},
	shaderCrystalPulse: {
		name: 'Crystal Pulse',
		icon: '\uD83D\uDC8E',
		params: buildShaderBuilderParams( {
			particleCount: 80000,
			emitterShape: 1,
			emitterRadius: 1.2,
			initialSpeedMin: 0.8,
			initialSpeedMax: 2.6,
			startSize: 0.07,
			turbulenceStrength: 1.6,
			vortexStrength: 3.2,
			bloomStrength: 1.35,
			bloomRadius: 0.44,
			exposure: 1.2,
			backgroundColor: '#09091b',
			colorGradient: [
				{ pos: 0.0, color: '#ffffff' },
				{ pos: 0.24, color: '#caf8ff' },
				{ pos: 0.5, color: '#89d8ff' },
				{ pos: 0.74, color: '#c39dff' },
				{ pos: 1.0, color: '#1c1031' }
			]
		} )
	},
	shaderLavaVeins: {
		name: 'Lava Veins',
		icon: '\uD83C\uDF0B',
		params: buildShaderBuilderParams( {
			particleCount: 88000,
			emitterShape: 2,
			emitterRadius: 0.9,
			initialSpeedMin: 1.4,
			initialSpeedMax: 3.6,
			startSize: 0.065,
			turbulenceStrength: 2.4,
			turbulenceSpeed: 2.2,
			vortexStrength: 2.5,
			bloomStrength: 1.45,
			bloomRadius: 0.48,
			exposure: 1.22,
			backgroundColor: '#100502',
			colorGradient: [
				{ pos: 0.0, color: '#fff3bf' },
				{ pos: 0.2, color: '#ffcc6f' },
				{ pos: 0.48, color: '#ff7a32' },
				{ pos: 0.72, color: '#d52d0e' },
				{ pos: 1.0, color: '#280500' }
			]
		} )
	},
	shaderVoidBloom: {
		name: 'Void Bloom',
		icon: '\uD83C\uDF11',
		params: buildShaderBuilderParams( {
			particleCount: 76000,
			emitterShape: 1,
			emitterRadius: 1.5,
			initialSpeedMin: 0.6,
			initialSpeedMax: 2.4,
			startSize: 0.08,
			turbulenceStrength: 1.8,
			vortexStrength: 4.6,
			bloomStrength: 1.5,
			bloomRadius: 0.54,
			exposure: 1.24,
			backgroundColor: '#05020e',
			colorGradient: [
				{ pos: 0.0, color: '#e6d5ff' },
				{ pos: 0.22, color: '#b08bff' },
				{ pos: 0.5, color: '#6d45ff' },
				{ pos: 0.75, color: '#3f1da8' },
				{ pos: 1.0, color: '#0d041f' }
			]
		} )
	}
} );

const CORE_PRESET_KEYS = [
	'fire',
	'smoke',
	'magicSparkles',
	'tornado',
	'fireworks',
	'galaxy',
	'snow',
	'fireflies',
	'electric',
	'waterfall',
	'aurora',
	'crystalBurst',
	'sakuraPetals',
	'portal',
	'dragonBreath'
];

const VFX_LAB_PRESET_KEYS = [
	'emberFlames',
	'plasmaTornado',
	'linkedNebula',
	'arcPulse',
	'vortexPortal',
	'supernovaBurst'
];

const MODEL_FX_PRESET_KEYS = [
	'modelReveal',
	'modelSwarm',
	'modelPulse',
	'modelShatter'
];

const SHADER_BUILDER_PRESET_KEYS = [
	'shaderNeonTornado',
	'shaderSolarRings',
	'shaderAuroraSheet',
	'shaderPlasmaWeb',
	'shaderWarpTunnel',
	'shaderCrystalPulse',
	'shaderLavaVeins',
	'shaderVoidBloom'
];

export const PRESET_CATEGORIES = {
	core: CORE_PRESET_KEYS,
	vfxLab: VFX_LAB_PRESET_KEYS,
	modelFx: MODEL_FX_PRESET_KEYS,
	shaderBuilder: SHADER_BUILDER_PRESET_KEYS
};

const coreMeta = Object.fromEntries(
	CORE_PRESET_KEYS.map( key => [ key, { category: 'core', backendProfile: 'balanced' } ] )
);

const modelFxDefaults = {
	samplingMode: 'surface',
	pointCount: 18000,
	attraction: 6.8,
	noiseStrength: 0.8,
	noiseScale: 1.35,
	noiseSpeed: 1.2,
	orbitStrength: 0.6,
	damping: 2.4,
	pointSize: 0.055,
	jitter: 0.18,
	pulseStrength: 0.08,
	pulseSpeed: 1.2,
	demoId: 'torusKnot'
};

const shaderBuilderMeta = {
	shaderNeonTornado: {
		category: 'shaderBuilder',
		backendProfile: 'webglFirst',
		shaderTemplateId: 'shaderNeonTornado',
		shaderBuilderDefaults: { overlayOpacity: 0.82, overlayIntensity: 1.0, tintColor: '#ffffff' },
		postFxDefaults: { bloomAmount: 0.8, blurAmount: 0.45, feedbackAmount: 0.28, vignetteAmount: 0.36, chromaticAmount: 0.12 },
		webglOverrides: { particleCount: 30000 }
	},
	shaderSolarRings: {
		category: 'shaderBuilder',
		backendProfile: 'webglFirst',
		shaderTemplateId: 'shaderSolarRings',
		shaderBuilderDefaults: { overlayOpacity: 0.86, overlayIntensity: 1.15, tintColor: '#ffd79a' },
		postFxDefaults: { bloomAmount: 1.0, blurAmount: 0.38, feedbackAmount: 0.16, vignetteAmount: 0.3, chromaticAmount: 0.08 },
		webglOverrides: { particleCount: 28000 }
	},
	shaderAuroraSheet: {
		category: 'shaderBuilder',
		backendProfile: 'webglFirst',
		shaderTemplateId: 'shaderAuroraSheet',
		shaderBuilderDefaults: { overlayOpacity: 0.72, overlayIntensity: 0.95, tintColor: '#c7f8ff' },
		postFxDefaults: { bloomAmount: 0.72, blurAmount: 0.52, feedbackAmount: 0.34, vignetteAmount: 0.24, chromaticAmount: 0.11 },
		webglOverrides: { particleCount: 26000 }
	},
	shaderPlasmaWeb: {
		category: 'shaderBuilder',
		backendProfile: 'webglFirst',
		shaderTemplateId: 'shaderPlasmaWeb',
		shaderBuilderDefaults: { overlayOpacity: 0.9, overlayIntensity: 1.2, tintColor: '#f0dbff' },
		postFxDefaults: { bloomAmount: 1.18, blurAmount: 0.58, feedbackAmount: 0.35, vignetteAmount: 0.42, chromaticAmount: 0.28 },
		webglOverrides: { particleCount: 32000 }
	},
	shaderWarpTunnel: {
		category: 'shaderBuilder',
		backendProfile: 'webglFirst',
		shaderTemplateId: 'shaderWarpTunnel',
		shaderBuilderDefaults: { overlayOpacity: 0.8, overlayIntensity: 1.08, tintColor: '#fff0cb' },
		postFxDefaults: { bloomAmount: 0.98, blurAmount: 0.62, feedbackAmount: 0.31, vignetteAmount: 0.45, chromaticAmount: 0.24 },
		webglOverrides: { particleCount: 30000 }
	},
	shaderCrystalPulse: {
		category: 'shaderBuilder',
		backendProfile: 'webglFirst',
		shaderTemplateId: 'shaderCrystalPulse',
		shaderBuilderDefaults: { overlayOpacity: 0.78, overlayIntensity: 1.02, tintColor: '#e7fbff' },
		postFxDefaults: { bloomAmount: 1.06, blurAmount: 0.36, feedbackAmount: 0.2, vignetteAmount: 0.3, chromaticAmount: 0.12 },
		webglOverrides: { particleCount: 27000 }
	},
	shaderLavaVeins: {
		category: 'shaderBuilder',
		backendProfile: 'webglFirst',
		shaderTemplateId: 'shaderLavaVeins',
		shaderBuilderDefaults: { overlayOpacity: 0.9, overlayIntensity: 1.12, tintColor: '#ffcf9f' },
		postFxDefaults: { bloomAmount: 1.24, blurAmount: 0.4, feedbackAmount: 0.14, vignetteAmount: 0.33, chromaticAmount: 0.09 },
		webglOverrides: { particleCount: 29000 }
	},
	shaderVoidBloom: {
		category: 'shaderBuilder',
		backendProfile: 'webglFirst',
		shaderTemplateId: 'shaderVoidBloom',
		shaderBuilderDefaults: { overlayOpacity: 0.82, overlayIntensity: 1.05, tintColor: '#dec8ff' },
		postFxDefaults: { bloomAmount: 0.9, blurAmount: 0.34, feedbackAmount: 0.27, vignetteAmount: 0.62, chromaticAmount: 0.17 },
		webglOverrides: { particleCount: 25000 }
	}
};

export const PRESET_META = {
	...coreMeta,
	emberFlames: {
		category: 'vfxLab',
		backendProfile: 'balanced',
		webglOverrides: {
			particleCount: 32000,
			turbulenceStrength: 1.9,
			turbulenceSpeed: 1.6,
			funnelStrength: 4.5,
			funnelBaseRadius: 0.26,
			funnelTopRadius: 1.2,
			funnelHeight: 3.2,
			velocityStretch: 0.25,
			velocityStretchFactor: 0.45,
			velocityStretchMax: 4.0,
			bloomStrength: 1.2,
			bloomRadius: 0.35,
			exposure: 1.18
		}
	},
	plasmaTornado: {
		category: 'vfxLab',
		backendProfile: 'balanced',
		webglOverrides: {
			particleCount: 30000,
			startSize: 0.12,
			turbulenceStrength: 1.4,
			vortexStrength: 8.8,
			funnelStrength: 11.0,
			funnelBaseRadius: 0.32,
			funnelTopRadius: 2.9,
			funnelHeight: 6.8,
			velocityStretch: 0.42,
			velocityStretchFactor: 0.8,
			velocityStretchMax: 5.4,
			bloomStrength: 1.55,
			bloomRadius: 0.5,
			exposure: 1.22
		}
	},
	linkedNebula: {
		category: 'vfxLab',
		backendProfile: 'balanced',
		webglOverrides: {
			particleCount: 34000,
			turbulenceStrength: 1.2,
			funnelStrength: 1.5,
			velocityStretch: 0.2,
			velocityStretchFactor: 0.35,
			velocityStretchMax: 3.5,
			bloomStrength: 1.0,
			bloomRadius: 0.32,
			exposure: 1.1
		}
	},
	arcPulse: {
		category: 'vfxLab',
		backendProfile: 'balanced',
		webglOverrides: {
			particleCount: 28000,
			turbulenceStrength: 2.9,
			turbulenceSpeed: 2.4,
			velocityStretch: 0.45,
			velocityStretchFactor: 0.75,
			velocityStretchMax: 5.5,
			bloomStrength: 1.4,
			bloomRadius: 0.45,
			exposure: 1.2
		}
	},
	vortexPortal: {
		category: 'vfxLab',
		backendProfile: 'balanced',
		webglOverrides: {
			particleCount: 30000,
			turbulenceStrength: 1.5,
			vortexStrength: 7.8,
			funnelStrength: 7.0,
			funnelBaseRadius: 0.6,
			funnelTopRadius: 2.6,
			funnelHeight: 6.0,
			velocityStretch: 0.3,
			velocityStretchFactor: 0.55,
			velocityStretchMax: 4.2,
			bloomStrength: 1.4,
			bloomRadius: 0.5,
			exposure: 1.15
		}
	},
	supernovaBurst: {
		category: 'vfxLab',
		backendProfile: 'balanced',
		webglOverrides: {
			particleCount: 35000,
			initialSpeedMax: 11.0,
			velocityStretch: 0.38,
			velocityStretchFactor: 0.7,
			velocityStretchMax: 5.2,
			bloomStrength: 1.45,
			bloomRadius: 0.42,
			exposure: 1.18
		}
	},
	modelReveal: {
		category: 'modelFx',
		backendProfile: 'webglFirst',
		webglOverrides: {
			particleCount: 18000,
			turbulenceStrength: 0.8,
			bloomStrength: 1.1,
			exposure: 1.16
		},
		modelFxDefaults: {
			...modelFxDefaults,
			pointCount: 18000,
			attraction: 8.4,
			noiseStrength: 0.45,
			noiseScale: 1.15,
			noiseSpeed: 0.9,
			orbitStrength: 0.28,
			damping: 3.3,
			pointSize: 0.055,
			jitter: 0.06,
			pulseStrength: 0.04,
			pulseSpeed: 0.9,
			demoId: 'torusKnot'
		}
	},
	modelSwarm: {
		category: 'modelFx',
		backendProfile: 'webglFirst',
		webglOverrides: {
			particleCount: 22000,
			turbulenceStrength: 1.6,
			velocityStretch: 0.3,
			bloomStrength: 1.25,
			exposure: 1.15
		},
		modelFxDefaults: {
			...modelFxDefaults,
			pointCount: 22000,
			attraction: 5.6,
			noiseStrength: 1.2,
			noiseScale: 1.6,
			noiseSpeed: 1.6,
			orbitStrength: 1.3,
			damping: 2.1,
			pointSize: 0.048,
			jitter: 0.32,
			pulseStrength: 0.12,
			pulseSpeed: 1.6,
			demoId: 'helix'
		}
	},
	modelPulse: {
		category: 'modelFx',
		backendProfile: 'webglFirst',
		webglOverrides: {
			particleCount: 20000,
			turbulenceStrength: 1.0,
			bloomStrength: 1.2,
			exposure: 1.2
		},
		modelFxDefaults: {
			...modelFxDefaults,
			pointCount: 20000,
			attraction: 6.7,
			noiseStrength: 0.72,
			noiseScale: 1.35,
			noiseSpeed: 1.2,
			orbitStrength: 0.55,
			damping: 2.8,
			pointSize: 0.058,
			jitter: 0.16,
			pulseStrength: 0.35,
			pulseSpeed: 2.2,
			demoId: 'crystal'
		}
	},
	modelShatter: {
		category: 'modelFx',
		backendProfile: 'webglFirst',
		webglOverrides: {
			particleCount: 26000,
			turbulenceStrength: 1.9,
			velocityStretch: 0.4,
			bloomStrength: 1.32,
			exposure: 1.24
		},
		modelFxDefaults: {
			...modelFxDefaults,
			pointCount: 26000,
			attraction: 4.1,
			noiseStrength: 1.6,
			noiseScale: 2.2,
			noiseSpeed: 2.25,
			orbitStrength: 1.7,
			damping: 1.6,
			pointSize: 0.045,
			jitter: 0.52,
			pulseStrength: 0.08,
			pulseSpeed: 1.3,
			demoId: 'torusKnot'
		}
	},
	...shaderBuilderMeta
};

// Ordered list of preset keys for UI display
export const PRESET_ORDER = [ ...CORE_PRESET_KEYS, ...VFX_LAB_PRESET_KEYS, ...MODEL_FX_PRESET_KEYS, ...SHADER_BUILDER_PRESET_KEYS ];

// Get preset by key
export function getPreset( key ) {

	return PRESETS[ key ] || PRESETS.fire;

}

// Get all preset names for UI
export function getPresetNames() {

	return PRESET_ORDER.map( key => ( {
		key,
		name: PRESETS[ key ].name,
		icon: PRESETS[ key ].icon
	} ) );

}

export function getPresetCategory( key ) {

	const meta = PRESET_META[ key ];
	return meta ? meta.category : 'core';

}

export function getPresetKeysByCategory( category ) {

	const keys = PRESET_CATEGORIES[ category ];
	return Array.isArray( keys ) && keys.length > 0 ? keys : PRESET_CATEGORIES.core;

}
