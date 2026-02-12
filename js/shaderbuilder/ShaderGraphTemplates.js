import { createNodeDescriptor } from './ShaderNodeDefinitions.js';

function deepClone( value ) {

	return JSON.parse( JSON.stringify( value ) );

}

function createGraphBuilder() {

	let nextNodeId = 1;
	let nextLinkId = 1;
	const nodes = [];
	const links = [];

	function addNode( type, x, y, properties = {} ) {

		const node = createNodeDescriptor( type, nextNodeId ++, x, y );
		node.properties = { ...node.properties, ...properties };
		nodes.push( node );
		return node;

	}

	function connect( fromNode, toNode, toInputIndex, fromOutputIndex = 0 ) {

		const linkId = nextLinkId ++;
		links.push( [
			linkId,
			fromNode.id,
			fromOutputIndex,
			toNode.id,
			toInputIndex,
			0
		] );

		if ( fromNode.outputs?.[ fromOutputIndex ] ) {

			if ( ! Array.isArray( fromNode.outputs[ fromOutputIndex ].links ) ) {

				fromNode.outputs[ fromOutputIndex ].links = [];

			}
			fromNode.outputs[ fromOutputIndex ].links.push( linkId );

		}

		if ( toNode.inputs?.[ toInputIndex ] ) {

			toNode.inputs[ toInputIndex ].link = linkId;

		}

		return linkId;

	}

	function build() {

		return {
			version: 1,
			last_node_id: nextNodeId - 1,
			last_link_id: nextLinkId - 1,
			nodes,
			links,
			groups: [],
			config: {}
		};

	}

	return { addNode, connect, build };

}

function createTemplateGraph( config ) {

	const g = createGraphBuilder();

	const uv = g.addNode( 'input/uv', 60, 70 );
	const time = g.addNode( 'input/time', 60, 210 );
	const rotSpeed = g.addNode( 'input/float', 280, 40, { value: config.rotSpeed } );
	const rotAngle = g.addNode( 'math/mul', 470, 80 );
	g.connect( time, rotAngle, 0 );
	g.connect( rotSpeed, rotAngle, 1 );

	const rotatedUv = g.addNode( 'pattern/rotate2d', 680, 90 );
	g.connect( uv, rotatedUv, 0 );
	g.connect( rotAngle, rotatedUv, 1 );

	const polar = g.addNode( 'pattern/polar', 890, 90 );
	g.connect( rotatedUv, polar, 0 );

	const fbmScale = g.addNode( 'input/float', 280, 210, { value: config.fbmScale } );
	const fbm = g.addNode( 'pattern/fbm', 1120, 90 );
	g.connect( polar, fbm, 0 );
	g.connect( fbmScale, fbm, 1 );

	const noiseScale = g.addNode( 'input/float', 280, 300, { value: config.noiseScale } );
	const noise = g.addNode( 'pattern/noise2d', 1120, 220 );
	g.connect( rotatedUv, noise, 0 );
	g.connect( noiseScale, noise, 1 );

	const pulseSpeed = g.addNode( 'input/float', 280, 390, { value: config.pulseSpeed } );
	const pulseAmp = g.addNode( 'input/float', 280, 450, { value: config.pulseAmp } );
	const pulseMul = g.addNode( 'math/mul', 470, 380 );
	g.connect( time, pulseMul, 0 );
	g.connect( pulseSpeed, pulseMul, 1 );

	const pulseSin = g.addNode( 'math/sin', 680, 380 );
	g.connect( pulseMul, pulseSin, 0 );

	const pulseTerm = g.addNode( 'math/mul', 890, 380 );
	g.connect( pulseSin, pulseTerm, 0 );
	g.connect( pulseAmp, pulseTerm, 1 );

	const flow = g.addNode( 'math/add', 1340, 120 );
	g.connect( fbm, flow, 0 );
	g.connect( pulseTerm, flow, 1 );

	const noiseMix = g.addNode( 'input/float', 280, 520, { value: config.noiseMix } );
	const mixedFlow = g.addNode( 'math/mix', 1560, 150 );
	g.connect( flow, mixedFlow, 0 );
	g.connect( noise, mixedFlow, 1 );
	g.connect( noiseMix, mixedFlow, 2 );

	const satFlow = g.addNode( 'color/saturate', 1780, 150 );
	g.connect( mixedFlow, satFlow, 0 );

	const color0 = g.addNode( 'input/vec3', 280, 630, { x: config.colors[ 0 ][ 0 ], y: config.colors[ 0 ][ 1 ], z: config.colors[ 0 ][ 2 ] } );
	const color1 = g.addNode( 'input/vec3', 280, 700, { x: config.colors[ 1 ][ 0 ], y: config.colors[ 1 ][ 1 ], z: config.colors[ 1 ][ 2 ] } );
	const color2 = g.addNode( 'input/vec3', 280, 770, { x: config.colors[ 2 ][ 0 ], y: config.colors[ 2 ][ 1 ], z: config.colors[ 2 ][ 2 ] } );

	const ramp = g.addNode( 'color/ramp3', 2010, 150 );
	g.connect( satFlow, ramp, 0 );
	g.connect( color0, ramp, 1 );
	g.connect( color1, ramp, 2 );
	g.connect( color2, ramp, 3 );

	const hueSpeed = g.addNode( 'input/float', 280, 840, { value: config.hueSpeed } );
	const hueShiftTime = g.addNode( 'math/mul', 470, 840 );
	g.connect( time, hueShiftTime, 0 );
	g.connect( hueSpeed, hueShiftTime, 1 );

	const hueShift = g.addNode( 'color/hueshift', 2230, 150 );
	g.connect( ramp, hueShift, 0 );
	g.connect( hueShiftTime, hueShift, 1 );

	const radius = g.addNode( 'math/length', 1120, 330 );
	g.connect( polar, radius, 0 );

	const edge0 = g.addNode( 'input/float', 280, 910, { value: config.edge0 } );
	const edge1 = g.addNode( 'input/float', 280, 970, { value: config.edge1 } );
	const falloff = g.addNode( 'math/smoothstep', 1340, 320 );
	g.connect( edge0, falloff, 0 );
	g.connect( edge1, falloff, 1 );
	g.connect( radius, falloff, 2 );

	const one = g.addNode( 'input/float', 280, 1030, { value: 1.0 } );
	const invFalloff = g.addNode( 'math/sub', 1560, 320 );
	g.connect( one, invFalloff, 0 );
	g.connect( falloff, invFalloff, 1 );

	const alphaScale = g.addNode( 'input/float', 280, 1090, { value: config.alphaScale } );
	const alpha = g.addNode( 'math/mul', 1780, 320 );
	g.connect( invFalloff, alpha, 0 );
	g.connect( alphaScale, alpha, 1 );

	const output = g.addNode( 'output/color', 2440, 220 );
	g.connect( hueShift, output, 0 );
	g.connect( alpha, output, 1 );

	return g.build();

}

function createAdvancedTemplateGraph( config ) {

	const g = createGraphBuilder();

	const uv = g.addNode( 'input/uv', 80, 90 );
	const time = g.addNode( 'input/time', 80, 220 );

	const warpStrength = g.addNode( 'input/float', 280, 80, { value: config.warpStrength } );
	const warpSpeed = g.addNode( 'input/float', 280, 150, { value: config.warpSpeed } );
	const warp = g.addNode( 'advanced/pattern/domainwarp2d', 500, 120 );
	g.connect( uv, warp, 0 );
	g.connect( warpStrength, warp, 1 );
	g.connect( warpSpeed, warp, 2 );

	const vorScale = g.addNode( 'input/float', 280, 250, { value: config.voronoiScale } );
	const vorJitter = g.addNode( 'input/float', 280, 320, { value: config.voronoiJitter } );
	const voronoi = g.addNode( 'advanced/pattern/voronoi2d', 740, 90 );
	g.connect( warp, voronoi, 0 );
	g.connect( vorScale, voronoi, 1 );
	g.connect( vorJitter, voronoi, 2 );

	const ridgedScale = g.addNode( 'input/float', 280, 400, { value: config.ridgedScale } );
	const ridgedGain = g.addNode( 'input/float', 280, 470, { value: config.ridgedGain } );
	const ridged = g.addNode( 'advanced/pattern/ridgedfbm', 740, 240 );
	g.connect( warp, ridged, 0 );
	g.connect( ridgedScale, ridged, 1 );
	g.connect( ridgedGain, ridged, 2 );

	const flowMixAmount = g.addNode( 'input/float', 280, 540, { value: config.flowMix } );
	const flowMix = g.addNode( 'math/mix', 980, 160 );
	g.connect( voronoi, flowMix, 0 );
	g.connect( ridged, flowMix, 1 );
	g.connect( flowMixAmount, flowMix, 2 );

	const remap = g.addNode( 'advanced/math/remap', 1220, 160 );
	const remapInMin = g.addNode( 'input/float', 280, 610, { value: config.remapInMin } );
	const remapInMax = g.addNode( 'input/float', 280, 680, { value: config.remapInMax } );
	const remapOutMin = g.addNode( 'input/float', 280, 750, { value: 0.0 } );
	const remapOutMax = g.addNode( 'input/float', 280, 820, { value: 1.0 } );
	g.connect( flowMix, remap, 0 );
	g.connect( remapInMin, remap, 1 );
	g.connect( remapInMax, remap, 2 );
	g.connect( remapOutMin, remap, 3 );
	g.connect( remapOutMax, remap, 4 );

	let colorDriver = remap;
	if ( config.causticMode ) {

		const causticEdge = g.addNode( 'input/float', 520, 970, { value: config.causticEdge ?? 0.62 } );
		const causticHard = g.addNode( 'advanced/math/step', 1460, 70 );
		g.connect( causticEdge, causticHard, 0 );
		g.connect( remap, causticHard, 1 );

		const causticBlend = g.addNode( 'input/float', 520, 1040, { value: config.causticBlend ?? 0.72 } );
		const causticMix = g.addNode( 'math/mix', 1700, 70 );
		g.connect( remap, causticMix, 0 );
		g.connect( causticHard, causticMix, 1 );
		g.connect( causticBlend, causticMix, 2 );

		const baseLift = g.addNode( 'input/float', 520, 1110, { value: config.baseLift ?? 0.14 } );
		const lifted = g.addNode( 'math/add', 1940, 70 );
		g.connect( causticMix, lifted, 0 );
		g.connect( baseLift, lifted, 1 );

		const liftedSat = g.addNode( 'color/saturate', 2180, 70 );
		g.connect( lifted, liftedSat, 0 );
		colorDriver = liftedSat;

	}

	const c0 = g.addNode( 'input/vec3', 520, 620, { x: config.colors[ 0 ][ 0 ], y: config.colors[ 0 ][ 1 ], z: config.colors[ 0 ][ 2 ] } );
	const c1 = g.addNode( 'input/vec3', 520, 690, { x: config.colors[ 1 ][ 0 ], y: config.colors[ 1 ][ 1 ], z: config.colors[ 1 ][ 2 ] } );
	const c2 = g.addNode( 'input/vec3', 520, 760, { x: config.colors[ 2 ][ 0 ], y: config.colors[ 2 ][ 1 ], z: config.colors[ 2 ][ 2 ] } );
	const c3 = g.addNode( 'input/vec3', 520, 830, { x: config.colors[ 3 ][ 0 ], y: config.colors[ 3 ][ 1 ], z: config.colors[ 3 ][ 2 ] } );
	const c4 = g.addNode( 'input/vec3', 520, 900, { x: config.colors[ 4 ][ 0 ], y: config.colors[ 4 ][ 1 ], z: config.colors[ 4 ][ 2 ] } );
	const gradient = g.addNode( 'advanced/color/gradient5', 1460, 170 );
	g.connect( colorDriver, gradient, 0 );
	g.connect( c0, gradient, 1 );
	g.connect( c1, gradient, 2 );
	g.connect( c2, gradient, 3 );
	g.connect( c3, gradient, 4 );
	g.connect( c4, gradient, 5 );

	const contrastAmount = g.addNode( 'input/float', 760, 620, { value: config.contrast } );
	const contrast = g.addNode( 'advanced/color/contrast', 1700, 170 );
	g.connect( gradient, contrast, 0 );
	g.connect( contrastAmount, contrast, 1 );

	const posterizeSteps = g.addNode( 'input/float', 760, 690, { value: config.posterizeSteps } );
	const posterize = g.addNode( 'advanced/color/posterize', 1940, 170 );
	g.connect( contrast, posterize, 0 );
	g.connect( posterizeSteps, posterize, 1 );

	const alphaScale = g.addNode( 'input/float', 760, 760, { value: config.alphaScale } );
	const alpha = g.addNode( 'math/mul', 1700, 300 );
	g.connect( colorDriver, alpha, 0 );
	g.connect( alphaScale, alpha, 1 );

	const output = g.addNode( 'output/color', 2180, 220 );
	g.connect( posterize, output, 0 );
	g.connect( alpha, output, 1 );

	const bloomAmount = g.addNode( 'input/float', 980, 620, { value: config.postfx.bloom } );
	const blurAmount = g.addNode( 'input/float', 980, 690, { value: config.postfx.blur } );
	const feedbackAmount = g.addNode( 'input/float', 980, 760, { value: config.postfx.feedback } );
	const vignetteAmount = g.addNode( 'input/float', 980, 830, { value: config.postfx.vignette } );
	const chromaticAmount = g.addNode( 'input/float', 980, 900, { value: config.postfx.chromatic } );

	const bloomNode = g.addNode( 'postfx/bloom', 1220, 620 );
	const blurNode = g.addNode( 'postfx/blur', 1220, 690 );
	const feedbackNode = g.addNode( 'postfx/feedback', 1220, 760 );
	const vignetteNode = g.addNode( 'postfx/vignette', 1220, 830 );
	const chromaticNode = g.addNode( 'postfx/chromatic', 1220, 900 );
	g.connect( bloomAmount, bloomNode, 0 );
	g.connect( blurAmount, blurNode, 0 );
	g.connect( feedbackAmount, feedbackNode, 0 );
	g.connect( vignetteAmount, vignetteNode, 0 );
	g.connect( chromaticAmount, chromaticNode, 0 );

	const outputPostFx = g.addNode( 'output/postfx', 1540, 760 );
	g.connect( bloomNode, outputPostFx, 0 );
	g.connect( blurNode, outputPostFx, 1 );
	g.connect( feedbackNode, outputPostFx, 2 );
	g.connect( vignetteNode, outputPostFx, 3 );
	g.connect( chromaticNode, outputPostFx, 4 );

	return g.build();

}

const TEMPLATE_CONFIGS = [
	{
		id: 'shaderNeonTornado',
		name: 'Neon Tornado',
		description: 'Vortex benzeri neon akış',
		rotSpeed: 0.26,
		fbmScale: 8.2,
		noiseScale: 5.2,
		pulseSpeed: 1.8,
		pulseAmp: 0.23,
		noiseMix: 0.35,
		hueSpeed: 0.42,
		edge0: 0.18,
		edge1: 1.08,
		alphaScale: 1.0,
		colors: [ [ 0.1, 0.18, 0.55 ], [ 0.2, 0.75, 1.0 ], [ 1.0, 0.35, 0.78 ] ]
	},
	{
		id: 'shaderSolarRings',
		name: 'Solar Rings',
		description: 'Sıcak halka dalgaları',
		rotSpeed: 0.16,
		fbmScale: 6.2,
		noiseScale: 3.8,
		pulseSpeed: 1.1,
		pulseAmp: 0.16,
		noiseMix: 0.28,
		hueSpeed: 0.14,
		edge0: 0.24,
		edge1: 1.18,
		alphaScale: 1.0,
		colors: [ [ 0.22, 0.06, 0.01 ], [ 0.97, 0.42, 0.12 ], [ 1.0, 0.93, 0.5 ] ]
	},
	{
		id: 'shaderAuroraSheet',
		name: 'Aurora Sheet',
		description: 'Yumuşak aurora perde akışı',
		rotSpeed: -0.08,
		fbmScale: 4.3,
		noiseScale: 2.1,
		pulseSpeed: 0.7,
		pulseAmp: 0.1,
		noiseMix: 0.4,
		hueSpeed: 0.08,
		edge0: 0.1,
		edge1: 1.32,
		alphaScale: 0.82,
		colors: [ [ 0.03, 0.11, 0.2 ], [ 0.2, 0.95, 0.75 ], [ 0.52, 0.38, 0.96 ] ]
	},
	{
		id: 'shaderPlasmaWeb',
		name: 'Plasma Web',
		description: 'Elektrik ağ benzeri damarlar',
		rotSpeed: 0.42,
		fbmScale: 12.4,
		noiseScale: 7.6,
		pulseSpeed: 2.4,
		pulseAmp: 0.35,
		noiseMix: 0.48,
		hueSpeed: 0.55,
		edge0: 0.3,
		edge1: 0.98,
		alphaScale: 1.0,
		colors: [ [ 0.02, 0.02, 0.1 ], [ 0.3, 0.5, 1.0 ], [ 0.9, 0.2, 1.0 ] ]
	},
	{
		id: 'shaderWarpTunnel',
		name: 'Warp Tunnel',
		description: 'Derinlik hissi veren tünel',
		rotSpeed: 0.36,
		fbmScale: 9.2,
		noiseScale: 4.9,
		pulseSpeed: 1.9,
		pulseAmp: 0.26,
		noiseMix: 0.52,
		hueSpeed: -0.2,
		edge0: 0.04,
		edge1: 0.9,
		alphaScale: 0.96,
		colors: [ [ 0.0, 0.03, 0.1 ], [ 0.18, 0.62, 1.0 ], [ 1.0, 0.88, 0.3 ] ]
	},
	{
		id: 'shaderCrystalPulse',
		name: 'Crystal Pulse',
		description: 'Kristal parıltı atımları',
		rotSpeed: 0.12,
		fbmScale: 5.7,
		noiseScale: 5.0,
		pulseSpeed: 3.1,
		pulseAmp: 0.4,
		noiseMix: 0.24,
		hueSpeed: 0.24,
		edge0: 0.2,
		edge1: 1.2,
		alphaScale: 0.94,
		colors: [ [ 0.08, 0.1, 0.24 ], [ 0.5, 0.95, 1.0 ], [ 1.0, 0.96, 0.98 ] ]
	},
	{
		id: 'shaderLavaVeins',
		name: 'Lava Veins',
		description: 'Lav damarları ve sıcak parlama',
		rotSpeed: 0.09,
		fbmScale: 10.5,
		noiseScale: 9.2,
		pulseSpeed: 1.4,
		pulseAmp: 0.2,
		noiseMix: 0.62,
		hueSpeed: 0.03,
		edge0: 0.26,
		edge1: 1.24,
		alphaScale: 1.0,
		colors: [ [ 0.06, 0.01, 0.01 ], [ 0.78, 0.18, 0.03 ], [ 1.0, 0.75, 0.22 ] ]
	},
	{
		id: 'shaderVoidBloom',
		name: 'Void Bloom',
		description: 'Karanlık merkezden açılan ışık',
		rotSpeed: -0.15,
		fbmScale: 7.1,
		noiseScale: 3.3,
		pulseSpeed: 0.95,
		pulseAmp: 0.14,
		noiseMix: 0.42,
		hueSpeed: 0.31,
		edge0: 0.09,
		edge1: 1.34,
		alphaScale: 0.92,
		colors: [ [ 0.03, 0.01, 0.08 ], [ 0.24, 0.14, 0.52 ], [ 0.68, 0.2, 1.0 ] ]
	}
];

const ADVANCED_TEMPLATE_CONFIGS = [
	{
		id: 'advElectricStorm',
		name: 'Adv Electric Storm',
		description: 'Voronoi + ridged distortion with electric post FX',
		warpStrength: 0.38,
		warpSpeed: 1.7,
		voronoiScale: 9.0,
		voronoiJitter: 0.95,
		ridgedScale: 4.8,
		ridgedGain: 0.66,
		flowMix: 0.56,
		remapInMin: 0.1,
		remapInMax: 0.92,
		contrast: 1.35,
		posterizeSteps: 7.0,
		alphaScale: 0.9,
		colors: [ [ 0.01, 0.02, 0.12 ], [ 0.09, 0.24, 0.68 ], [ 0.21, 0.66, 0.98 ], [ 0.58, 0.39, 0.98 ], [ 0.98, 0.92, 1.0 ] ],
		postfx: { bloom: 1.28, blur: 0.42, feedback: 0.12, vignette: 0.18, chromatic: 0.2 }
	},
	{
		id: 'advMoltenFlow',
		name: 'Adv Molten Flow',
		description: 'Lava-like layered flow with hot bloom',
		warpStrength: 0.22,
		warpSpeed: 1.1,
		voronoiScale: 6.2,
		voronoiJitter: 0.82,
		ridgedScale: 3.4,
		ridgedGain: 0.58,
		flowMix: 0.44,
		remapInMin: 0.16,
		remapInMax: 0.88,
		contrast: 1.2,
		posterizeSteps: 6.0,
		alphaScale: 0.88,
		colors: [ [ 0.06, 0.01, 0.01 ], [ 0.25, 0.04, 0.01 ], [ 0.68, 0.14, 0.02 ], [ 1.0, 0.45, 0.1 ], [ 1.0, 0.82, 0.32 ] ],
		postfx: { bloom: 1.38, blur: 0.34, feedback: 0.08, vignette: 0.16, chromatic: 0.08 }
	},
	{
		id: 'advHoloTunnel',
		name: 'Adv Holo Tunnel',
		description: 'High-frequency tunnel with spectral split',
		warpStrength: 0.42,
		warpSpeed: 2.05,
		voronoiScale: 12.0,
		voronoiJitter: 1.0,
		ridgedScale: 5.8,
		ridgedGain: 0.7,
		flowMix: 0.62,
		remapInMin: 0.05,
		remapInMax: 0.9,
		contrast: 1.42,
		posterizeSteps: 8.0,
		alphaScale: 0.84,
		colors: [ [ 0.0, 0.06, 0.14 ], [ 0.08, 0.24, 0.45 ], [ 0.16, 0.82, 0.95 ], [ 0.55, 0.26, 0.97 ], [ 0.96, 0.94, 1.0 ] ],
		postfx: { bloom: 1.22, blur: 0.48, feedback: 0.11, vignette: 0.2, chromatic: 0.24 }
	},
	{
		id: 'advNebulaVeins',
		name: 'Adv Nebula Veins',
		description: 'Soft nebula strands with persistent feedback',
		warpStrength: 0.28,
		warpSpeed: 0.85,
		voronoiScale: 5.4,
		voronoiJitter: 0.68,
		ridgedScale: 2.8,
		ridgedGain: 0.55,
		flowMix: 0.47,
		remapInMin: 0.14,
		remapInMax: 0.9,
		contrast: 1.08,
		posterizeSteps: 5.0,
		alphaScale: 0.78,
		colors: [ [ 0.01, 0.03, 0.11 ], [ 0.11, 0.18, 0.4 ], [ 0.28, 0.46, 0.88 ], [ 0.66, 0.32, 0.9 ], [ 0.92, 0.7, 1.0 ] ],
		postfx: { bloom: 1.12, blur: 0.42, feedback: 0.1, vignette: 0.14, chromatic: 0.12 }
	},
	{
		id: 'advVoidPulse',
		name: 'Adv Void Pulse',
		description: 'Dark pulse core with aggressive vignette',
		warpStrength: 0.2,
		warpSpeed: 0.66,
		voronoiScale: 7.5,
		voronoiJitter: 0.9,
		ridgedScale: 4.1,
		ridgedGain: 0.74,
		flowMix: 0.58,
		remapInMin: 0.18,
		remapInMax: 0.94,
		contrast: 1.38,
		posterizeSteps: 6.0,
		alphaScale: 0.82,
		colors: [ [ 0.02, 0.01, 0.07 ], [ 0.08, 0.03, 0.2 ], [ 0.2, 0.1, 0.46 ], [ 0.62, 0.14, 0.8 ], [ 0.96, 0.52, 1.0 ] ],
		postfx: { bloom: 1.02, blur: 0.28, feedback: 0.08, vignette: 0.22, chromatic: 0.14 }
	},
	{
		id: 'advPhotonBloom',
		name: 'Adv Photon Bloom',
		description: 'High-brightness bloom heavy spectral effect',
		warpStrength: 0.34,
		warpSpeed: 1.52,
		voronoiScale: 10.2,
		voronoiJitter: 0.92,
		ridgedScale: 4.9,
		ridgedGain: 0.62,
		flowMix: 0.53,
		remapInMin: 0.08,
		remapInMax: 0.91,
		contrast: 1.5,
		posterizeSteps: 9.0,
		alphaScale: 0.92,
		colors: [ [ 0.03, 0.06, 0.18 ], [ 0.18, 0.42, 0.9 ], [ 0.28, 0.82, 0.98 ], [ 0.82, 0.58, 1.0 ], [ 1.0, 0.96, 0.86 ] ],
		postfx: { bloom: 1.52, blur: 0.56, feedback: 0.12, vignette: 0.16, chromatic: 0.3 }
	},
	{
		id: 'advOceanShader',
		name: 'Adv Ocean Shader',
		description: 'Deep ocean caustics inspired flowing water look',
		renderMode: 'oceanPro',
		warpStrength: 0.19,
		warpSpeed: 0.68,
		voronoiScale: 7.8,
		voronoiJitter: 0.96,
		ridgedScale: 2.8,
		ridgedGain: 0.61,
		flowMix: 0.22,
		remapInMin: 0.05,
		remapInMax: 0.42,
		contrast: 1.34,
		posterizeSteps: 26.0,
		alphaScale: 1.42,
		causticMode: true,
		causticEdge: 0.73,
		causticBlend: 0.78,
		baseLift: 0.19,
		colors: [ [ 0.02, 0.16, 0.28 ], [ 0.06, 0.36, 0.56 ], [ 0.2, 0.66, 0.88 ], [ 0.74, 0.92, 0.98 ], [ 1.0, 1.0, 0.96 ] ],
		postfx: { bloom: 1.58, blur: 0.48, feedback: 0.05, vignette: 0.08, chromatic: 0.03 },
		oceanProDefaults: {
			waveScale: 2.9,
			causticScale: 5.8,
			choppy: 1.2,
			flowSpeed: 0.55,
			causticBoost: 1.28,
			deepColor: '#0a334f',
			shallowColor: '#6cd2d9'
		}
	},
	{
		id: 'advOceanSeascape',
		name: 'Ocean Pro (Seascape)',
		description: 'Raymarch-inspired cinematic ocean shading mode',
		renderMode: 'oceanPro',
		warpStrength: 0.18,
		warpSpeed: 0.54,
		voronoiScale: 6.8,
		voronoiJitter: 0.92,
		ridgedScale: 2.5,
		ridgedGain: 0.64,
		flowMix: 0.18,
		remapInMin: 0.04,
		remapInMax: 0.4,
		contrast: 1.38,
		posterizeSteps: 28.0,
		alphaScale: 1.45,
		causticMode: true,
		causticEdge: 0.76,
		causticBlend: 0.83,
		baseLift: 0.17,
		colors: [ [ 0.01, 0.08, 0.15 ], [ 0.02, 0.22, 0.38 ], [ 0.12, 0.52, 0.73 ], [ 0.68, 0.86, 0.95 ], [ 0.98, 1.0, 0.98 ] ],
		postfx: { bloom: 1.62, blur: 0.52, feedback: 0.06, vignette: 0.09, chromatic: 0.04 },
		oceanProDefaults: {
			waveScale: 3.4,
			causticScale: 7.2,
			choppy: 1.6,
			flowSpeed: 0.62,
			causticBoost: 1.35,
			night: false,
			deepColor: '#08293f',
			shallowColor: '#8ad9e0'
		}
	},
	{
		id: 'advFirePro',
		name: 'Fire Pro (Cinematic)',
		description: 'Dedicated cinematic fire renderer with glow and sparks',
		renderMode: 'firePro',
		warpStrength: 0.31,
		warpSpeed: 1.35,
		voronoiScale: 7.5,
		voronoiJitter: 0.9,
		ridgedScale: 3.7,
		ridgedGain: 0.65,
		flowMix: 0.48,
		remapInMin: 0.08,
		remapInMax: 0.84,
		contrast: 1.42,
		posterizeSteps: 12.0,
		alphaScale: 1.18,
		causticMode: false,
		colors: [ [ 0.07, 0.01, 0.01 ], [ 0.36, 0.06, 0.01 ], [ 0.86, 0.23, 0.03 ], [ 1.0, 0.58, 0.14 ], [ 1.0, 0.93, 0.62 ] ],
		postfx: { bloom: 2.08, blur: 0.46, feedback: 0.04, vignette: 0.16, chromatic: 0.07 },
		fireProDefaults: {
			noiseScale: 3.4,
			turbulence: 1.24,
			updraft: 1.8,
			glow: 1.4,
			sparkAmount: 0.76,
			coreColor: '#fff2d1',
			flameColor: '#ff5a17',
			smokeColor: '#1a0805'
		}
	}
];

const TEMPLATE_MAP = new Map();
for ( const config of TEMPLATE_CONFIGS ) {

	TEMPLATE_MAP.set( config.id, {
		id: config.id,
		name: config.name,
		description: config.description,
		tier: 'basic',
		renderMode: config.renderMode || 'graph',
		oceanProDefaults: config.oceanProDefaults ? deepClone( config.oceanProDefaults ) : null,
		fireProDefaults: config.fireProDefaults ? deepClone( config.fireProDefaults ) : null,
		graph: createTemplateGraph( config )
	} );

}

for ( const config of ADVANCED_TEMPLATE_CONFIGS ) {

	TEMPLATE_MAP.set( config.id, {
		id: config.id,
		name: config.name,
		description: config.description,
		tier: 'advanced',
		renderMode: config.renderMode || 'graph',
		oceanProDefaults: config.oceanProDefaults ? deepClone( config.oceanProDefaults ) : null,
		fireProDefaults: config.fireProDefaults ? deepClone( config.fireProDefaults ) : null,
		graph: createAdvancedTemplateGraph( config )
	} );

}

export function getShaderBuilderTemplates() {

	const source = [ ...TEMPLATE_CONFIGS, ...ADVANCED_TEMPLATE_CONFIGS ];
	const advancedIds = new Set( ADVANCED_TEMPLATE_CONFIGS.map( ( config ) => config.id ) );
	return source.map( ( config ) => ( {
		id: config.id,
		name: config.name,
		description: config.description,
		tier: advancedIds.has( config.id ) ? 'advanced' : 'basic',
		renderMode: config.renderMode || 'graph'
	} ) );

}

export function getShaderTemplate( templateId ) {

	const template = TEMPLATE_MAP.get( templateId );
	if ( ! template ) return null;
	return {
		id: template.id,
		name: template.name,
		description: template.description,
		tier: template.tier || 'basic',
		renderMode: template.renderMode || 'graph',
		oceanProDefaults: template.oceanProDefaults ? deepClone( template.oceanProDefaults ) : null,
		fireProDefaults: template.fireProDefaults ? deepClone( template.fireProDefaults ) : null,
		graph: deepClone( template.graph )
	};

}

export function getDefaultShaderTemplate() {

	return getShaderTemplate( 'shaderNeonTornado' );

}
