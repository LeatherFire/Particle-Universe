import * as THREE from 'three/webgpu';
import * as THREE_WEBGL from 'three/webgl';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

import { ParticleSystem } from './ParticleSystem.js';
import { PostProcessingManager } from './rendering/PostProcessing.js';
import { CompatibilityPostProcessingManager } from './rendering/CompatibilityPostProcessing.js';
import { ControlPanel } from './ui/ControlPanel.js';
import { PresetManager } from './presets/PresetManager.js';
import { PRESET_ORDER, PRESETS, getPresetCategory, getPresetKeysByCategory } from './presets/PresetLibrary.js';
import { ScreenCapture } from './utils/ScreenCapture.js';
import { WebGLCompatibilitySystem } from './fallback/WebGLCompatibilitySystem.js';
import { WebGLVFXLab } from './vfx/WebGLVFXLab.js';
import { WebGLModelFXSystem } from './model/WebGLModelFXSystem.js';
import { ModelFXPanel } from './ui/ModelFXPanel.js';
import { WebGLShaderBuilderSystem } from './shaderbuilder/WebGLShaderBuilderSystem.js';
import { ShaderBuilderPanel } from './ui/ShaderBuilderPanel.js';

const BACKENDS = {
	AUTO: 'auto',
	WEBGPU: 'webgpu',
	WEBGL: 'webgl'
};
const DEFAULT_BACKEND = BACKENDS.WEBGL;
const STORAGE_KEYS = {
	PREFERRED_BACKEND: 'particle_universe_preferred_backend'
};
const DEMO_DEFAULT_INTERVAL_MS = 7000;
const BENCH_DEFAULT_DURATION_MS = 7000;
const BENCH_DEFAULT_WARMUP_MS = 900;

let renderer, scene, camera, controls;
let particleSystem, compatibilitySystem, postProcessing, controlPanel, presetManager, screenCapture;
let webglVFXLab = null;
let webglModelFXSystem = null;
let modelFXPanel = null;
let webglShaderBuilderSystem = null;
let shaderBuilderPanel = null;
let gridHelper;
let requestedBackend = BACKENDS.AUTO;
let activeBackend = null;
let lastSelectedPreset = 'fire';
let runtimeFallbackUsed = false;
let noParticleFrameCount = 0;
let darkScreenProbeFailures = 0;
let lastPresetChangeTime = 0;
let webgpuRenderedFrameCount = 0;
let vfxOverlayActive = false;
let buttonsBound = false;
let fpsHistory = [];
let lastTime = performance.now();
let probeCanvas = null;
let probeContext = null;
let runtimeNoticeTimer = null;
let pendingModelSwitch = false;
let pendingShaderBuilderSwitch = false;
const runtimeModeConfig = parseRuntimeModeConfig();
let demoModeState = null;
let benchmarkModeState = null;

async function init() {

	requestedBackend = getRequestedBackend();

	const canvas = document.getElementById( 'viewport' );
	if ( ! canvas ) throw new Error( 'Viewport canvas not found.' );

	createScene( canvas );
	await initializeBackend( canvas );

	setupButtons();
	startRuntimeModes();
	hideLoading();

	renderer.setAnimationLoop( animate );
	window.addEventListener( 'resize', onWindowResize );

}

function getRequestedBackend() {

	const backendParam = new URLSearchParams( window.location.search ).get( 'backend' );
	if ( backendParam ) {

		const normalized = backendParam.toLowerCase();
		if ( normalized === BACKENDS.WEBGPU || normalized === BACKENDS.WEBGL || normalized === BACKENDS.AUTO ) {

			return normalized;

		}

		return DEFAULT_BACKEND;

	}

	return DEFAULT_BACKEND;

}

function parseRuntimeModeConfig() {

	const params = new URLSearchParams( window.location.search );
	const modeParam = ( params.get( 'mode' ) || '' ).toLowerCase();
	const benchmarkEnabled = parseBooleanQueryValue( params.get( 'bench' ) ) || modeParam === 'benchmark';
	const demoEnabled = ! benchmarkEnabled && ( parseBooleanQueryValue( params.get( 'demo' ) ) || modeParam === 'demo' );

	return {
		benchmarkEnabled,
		demoEnabled,
		demoIntervalMs: parseRangeIntQueryValue( params.get( 'demoIntervalMs' ), DEMO_DEFAULT_INTERVAL_MS, 2000, 60000 ),
		demoCategory: parsePresetScope( params.get( 'demoSet' ) ),
		benchDurationMs: parseRangeIntQueryValue( params.get( 'benchDurationMs' ), BENCH_DEFAULT_DURATION_MS, 2500, 30000 ),
		benchWarmupMs: parseRangeIntQueryValue( params.get( 'benchWarmupMs' ), BENCH_DEFAULT_WARMUP_MS, 0, 5000 ),
		benchCategory: parsePresetScope( params.get( 'benchSet' ) )
	};

}

function parseBooleanQueryValue( value ) {

	if ( value === null ) return false;
	const normalized = String( value ).trim().toLowerCase();
	return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on';

}

function parseRangeIntQueryValue( value, fallback, min, max ) {

	const parsed = Number.parseInt( value, 10 );
	if ( Number.isNaN( parsed ) ) return fallback;
	return Math.max( min, Math.min( max, parsed ) );

}

function parsePresetScope( value ) {

	const normalized = ( value || 'all' ).toLowerCase();
	if ( normalized === 'core' ) return 'core';
	if ( normalized === 'vfxlab' || normalized === 'vfx_lab' || normalized === 'lab' ) return 'vfxLab';
	if ( normalized === 'modelfx' || normalized === 'model_fx' || normalized === 'model' ) return 'modelFx';
	if ( normalized === 'shaderbuilder' || normalized === 'shader_builder' || normalized === 'shader' ) return 'shaderBuilder';
	return 'all';

}

function resolvePresetSequence( scope ) {

	if ( scope === 'core' ) return getPresetKeysByCategory( 'core' ).slice();
	if ( scope === 'vfxLab' ) return getPresetKeysByCategory( 'vfxLab' ).slice();
	if ( scope === 'modelFx' ) return getPresetKeysByCategory( 'modelFx' ).slice();
	if ( scope === 'shaderBuilder' ) return getPresetKeysByCategory( 'shaderBuilder' ).slice();
	return PRESET_ORDER.slice();

}

function getSavedBackendPreference() {

	try {

		const preferred = window.localStorage.getItem( STORAGE_KEYS.PREFERRED_BACKEND );
		if ( preferred === BACKENDS.WEBGPU || preferred === BACKENDS.WEBGL ) return preferred;
		return null;

	} catch ( error ) {

		return null;

	}

}

function setSavedBackendPreference( backend ) {

	try {

		if ( backend === BACKENDS.WEBGPU || backend === BACKENDS.WEBGL ) {

			window.localStorage.setItem( STORAGE_KEYS.PREFERRED_BACKEND, backend );

		}

	} catch ( error ) {

		// Ignore storage failures (private mode, blocked storage, etc.).

	}

}

function getPresetBackendMode( backend ) {

	return backend === BACKENDS.WEBGL ? BACKENDS.WEBGL : BACKENDS.WEBGPU;

}

function getWebGPUFailureReason( error ) {

	const message = String( error?.message || error || 'Unknown WebGPU error' );
	const lower = message.toLowerCase();

	if ( lower.includes( 'unsafe-eval' ) || lower.includes( 'content security policy' ) || lower.includes( 'csp' ) ) {

		return 'CSP blocks dynamic shader compilation.';

	}

	if ( lower.includes( 'visibility validation failed without post-processing' ) ) {

		return 'WebGPU frame output remained dark after disabling post-processing.';

	}

	if ( lower.includes( 'visibility validation failed' ) ) {

		return 'WebGPU visibility validation failed.';

	}

	if ( lower.includes( 'not available' ) || lower.includes( 'not supported' ) ) {

		return 'WebGPU is unavailable on this browser/device.';

	}

	return message;

}

function handlePresetSelection( presetName ) {

	lastSelectedPreset = presetName || 'fire';
	lastPresetChangeTime = performance.now();
	darkScreenProbeFailures = 0;
	const presetCategory = getPresetCategory( lastSelectedPreset );

	if ( presetCategory === 'modelFx' && activeBackend === BACKENDS.WEBGPU ) {

		ensureModelFXCompatibilityBackend();
		return;

	}

	if ( presetCategory === 'shaderBuilder' && activeBackend === BACKENDS.WEBGPU ) {

		ensureShaderBuilderCompatibilityBackend();
		return;

	}

	if ( activeBackend === BACKENDS.WEBGL ) {

		const mode = syncWebGLSpecialPresetMode();
		if ( mode === 'vfxLab' ) {

			showRuntimeNotice( 'VFX Lab GLSL modu aktif.' );

		} else if ( mode === 'modelFx' ) {

			showRuntimeNotice( 'Model FX modu aktif. GLB yukleyebilir veya demo model secebilirsin.' );

		} else if ( mode === 'shaderBuilder' ) {

			showRuntimeNotice( 'Shader Builder aktif. Blueprint ile shader olusturabilirsin.' );

		}

	}

}

function ensureShaderBuilderCompatibilityBackend() {

	if ( pendingShaderBuilderSwitch || activeBackend !== BACKENDS.WEBGPU ) return;
	pendingShaderBuilderSwitch = true;

	showRuntimeNotice( 'Shader Builder WebGL compatibility modunda aciliyor...' );

	const canvas = renderer ? renderer.domElement : document.getElementById( 'viewport' );
	initWebGLCompatibility(
		canvas,
		'Compatibility mode active: Shader Builder requires WebGL.',
		{ savePreference: false }
	).then( () => {

		if ( renderer ) renderer.setAnimationLoop( animate );
		showRuntimeNotice( 'Shader Builder icin WebGL mode aktif edildi.' );

	} ).catch( ( error ) => {

		console.error( 'Shader Builder compatibility switch failed:', error );
		showRuntimeNotice( 'Shader Builder gecisi basarisiz oldu.' );

	} ).finally( () => {

		pendingShaderBuilderSwitch = false;

	} );

}

function ensureModelFXCompatibilityBackend() {

	if ( pendingModelSwitch || activeBackend !== BACKENDS.WEBGPU ) return;
	pendingModelSwitch = true;

	showRuntimeNotice( 'Model FX WebGL compatibility modunda aciliyor...' );

	const canvas = renderer ? renderer.domElement : document.getElementById( 'viewport' );
	initWebGLCompatibility(
		canvas,
		'Compatibility mode active: Model FX requires WebGL.',
		{ savePreference: false }
	).then( () => {

		if ( renderer ) renderer.setAnimationLoop( animate );
		showRuntimeNotice( 'Model FX icin WebGL mode aktif edildi.' );

	} ).catch( ( error ) => {

		console.error( 'Model FX compatibility switch failed:', error );
		showRuntimeNotice( 'Model FX gecisi basarisiz oldu.' );

	} ).finally( () => {

		pendingModelSwitch = false;

	} );

}

function showRuntimeNotice( message, durationMs = 2600 ) {

	const notice = document.getElementById( 'runtime-notice' );
	if ( ! notice ) return;

	notice.textContent = message;
	notice.classList.add( 'visible' );

	if ( runtimeNoticeTimer ) clearTimeout( runtimeNoticeTimer );
	runtimeNoticeTimer = setTimeout( () => {

		notice.classList.remove( 'visible' );

	}, durationMs );

}

function applyPresetForBackend( targetPresetManager, backend, presetName ) {

	if ( ! targetPresetManager ) return 'fire';

	lastPresetChangeTime = performance.now();
	darkScreenProbeFailures = 0;

	const resolvedPreset = targetPresetManager.applyPreset(
		presetName,
		0,
		{ backend: getPresetBackendMode( backend ) }
	);

	if ( resolvedPreset !== presetName ) {

		showRuntimeNotice( `Preset "${ presetName }" bulunamadi. Fire kullanildi.` );

	}

	lastSelectedPreset = resolvedPreset;
	return resolvedPreset;

}

function syncPresetUI( presetName ) {

	if ( controlPanel ) controlPanel.syncFromPreset( presetName );
	activatePresetButton( presetName );

}

function setCompatibilityParticleEmphasis( mode ) {

	if ( ! compatibilitySystem || ! compatibilitySystem.material ) return;

	const normalizedMode = mode === 'modelFx' || mode === 'vfxLab' || mode === 'shaderBuilder' ? mode : 'core';
	if ( normalizedMode === 'modelFx' ) {

		compatibilitySystem.material.opacity = 0.14;
		if ( typeof compatibilitySystem.setRuntimeParticleCap === 'function' ) compatibilitySystem.setRuntimeParticleCap( 12000 );

	} else if ( normalizedMode === 'shaderBuilder' ) {

		compatibilitySystem.material.opacity = 0.0;
		if ( typeof compatibilitySystem.setRuntimeParticleCap === 'function' ) compatibilitySystem.setRuntimeParticleCap( 0 );

	} else if ( normalizedMode === 'vfxLab' ) {

		compatibilitySystem.material.opacity = 0.24;
		if ( typeof compatibilitySystem.setRuntimeParticleCap === 'function' ) compatibilitySystem.setRuntimeParticleCap( null );

	} else {

		compatibilitySystem.material.opacity = 0.95;
		if ( typeof compatibilitySystem.setRuntimeParticleCap === 'function' ) compatibilitySystem.setRuntimeParticleCap( null );

	}

	compatibilitySystem.material.needsUpdate = true;

}

function syncWebGLVFXPreset() {

	if ( ! webglVFXLab ) {

		vfxOverlayActive = false;
		return false;

	}

	if ( activeBackend !== BACKENDS.WEBGL ) {

		webglVFXLab.clear();
		vfxOverlayActive = false;
		return false;

	}

	if ( getPresetCategory( lastSelectedPreset ) !== 'vfxLab' ) {

		webglVFXLab.clear();
		vfxOverlayActive = false;
		return false;

	}

	const activated = webglVFXLab.applyPreset( lastSelectedPreset );
	vfxOverlayActive = activated;

	if ( activated && controls && camera ) {

		controls.target.set( 0, 1.8, 0 );
		if ( camera.position.y < 0.4 || camera.position.length() > 16 ) {

			camera.position.set( 0, 2.8, 8.0 );

		}
		controls.update();

	}

	return activated;

}

function syncWebGLModelFXPreset() {

	if ( ! webglModelFXSystem ) {

		if ( modelFXPanel ) modelFXPanel.setVisible( false );
		return false;

	}

	if ( activeBackend !== BACKENDS.WEBGL ) {

		webglModelFXSystem.clear();
		if ( modelFXPanel ) modelFXPanel.setVisible( false );
		return false;

	}

	if ( getPresetCategory( lastSelectedPreset ) !== 'modelFx' ) {

		webglModelFXSystem.clear();
		if ( modelFXPanel ) modelFXPanel.setVisible( false );
		return false;

	}

	const activated = webglModelFXSystem.applyPreset( lastSelectedPreset );
	if ( modelFXPanel ) {

		modelFXPanel.setVisible( true );
		modelFXPanel.setEnabled( true );
		modelFXPanel.sync( webglModelFXSystem.getState() );

	}

	if ( activated && controls && camera ) {

		controls.target.set( 0, 1.6, 0 );
		if ( camera.position.y < 0.4 || camera.position.length() > 20 ) {

			camera.position.set( 0, 2.4, 7.4 );

		}
		controls.update();

	}

	return activated;

}

function syncWebGLShaderBuilderPreset() {

	if ( ! webglShaderBuilderSystem ) {

		if ( shaderBuilderPanel ) shaderBuilderPanel.setVisible( false );
		return false;

	}

	if ( activeBackend !== BACKENDS.WEBGL ) {

		webglShaderBuilderSystem.clear();
		if ( shaderBuilderPanel ) shaderBuilderPanel.setVisible( false );
		return false;

	}

	if ( getPresetCategory( lastSelectedPreset ) !== 'shaderBuilder' ) {

		webglShaderBuilderSystem.clear();
		if ( shaderBuilderPanel ) shaderBuilderPanel.setVisible( false );
		return false;

	}

	const activated = webglShaderBuilderSystem.applyPreset( lastSelectedPreset );
	if ( shaderBuilderPanel ) {

		shaderBuilderPanel.setVisible( true );
		shaderBuilderPanel.setEnabled( true );
		shaderBuilderPanel.sync( webglShaderBuilderSystem.getState() );

	}

	if ( activated && controls && camera ) {

		controls.target.set( 0, 1.4, 0 );
		if ( camera.position.y < 0.4 || camera.position.length() > 22 ) {

			camera.position.set( 0, 2.2, 7.6 );

		}
		controls.update();

	}

	return activated;

}

function syncWebGLSpecialPresetMode() {

	const presetCategory = getPresetCategory( lastSelectedPreset );

	const vfxActive = presetCategory === 'vfxLab' ? syncWebGLVFXPreset() : false;
	const modelActive = presetCategory === 'modelFx' ? syncWebGLModelFXPreset() : false;
	const shaderBuilderActive = presetCategory === 'shaderBuilder' ? syncWebGLShaderBuilderPreset() : false;

	if ( ! vfxActive && webglVFXLab ) webglVFXLab.clear();
	if ( ! modelActive && webglModelFXSystem ) {

		webglModelFXSystem.clear();
		if ( modelFXPanel ) modelFXPanel.setVisible( false );

	}
	if ( ! shaderBuilderActive && webglShaderBuilderSystem ) {

		webglShaderBuilderSystem.clear();
		if ( shaderBuilderPanel ) shaderBuilderPanel.setVisible( false );

	}

	if ( modelActive ) {

		setShaderBuilderUILayout( false );
		setCompatibilityParticleEmphasis( 'modelFx' );
		return 'modelFx';

	}

	if ( shaderBuilderActive ) {

		setShaderBuilderUILayout( true );
		setCompatibilityParticleEmphasis( 'shaderBuilder' );
		return 'shaderBuilder';

	}

	if ( vfxActive ) {

		setShaderBuilderUILayout( false );
		setCompatibilityParticleEmphasis( 'vfxLab' );
		return 'vfxLab';

	}

	setShaderBuilderUILayout( false );
	setCompatibilityParticleEmphasis( 'core' );
	return 'core';

}

function startRuntimeModes() {

	demoModeState = null;
	benchmarkModeState = null;

	if ( runtimeModeConfig.benchmarkEnabled ) {

		startBenchmarkMode();
		return;

	}

	if ( runtimeModeConfig.demoEnabled ) {

		startDemoMode();

	}

}

function startDemoMode() {

	const presets = resolvePresetSequence( runtimeModeConfig.demoCategory ).filter( key => Boolean( PRESETS[ key ] ) );
	if ( presets.length === 0 ) return;

	const selectedIndex = presets.indexOf( lastSelectedPreset );
	demoModeState = {
		presets,
		index: selectedIndex >= 0 ? selectedIndex : 0,
		intervalMs: runtimeModeConfig.demoIntervalMs,
		nextSwitchAt: performance.now() + runtimeModeConfig.demoIntervalMs
	};

	showRuntimeNotice(
		`Demo mode aktif (${ presets.length } preset, ${ Math.round( runtimeModeConfig.demoIntervalMs / 1000 ) }sn interval).`
	);

}

function startBenchmarkMode() {

	const presets = resolvePresetSequence( runtimeModeConfig.benchCategory ).filter( key => Boolean( PRESETS[ key ] ) );
	if ( presets.length === 0 ) return;

	benchmarkModeState = {
		presets,
		durationMs: runtimeModeConfig.benchDurationMs,
		warmupMs: runtimeModeConfig.benchWarmupMs,
		index: - 1,
		activeSample: null,
		results: [],
		running: true
	};

	showRuntimeNotice(
		`Benchmark mode aktif (${ presets.length } preset, ${ Math.round( runtimeModeConfig.benchDurationMs / 1000 ) }sn).`,
		3600
	);

	beginNextBenchmarkSample( performance.now() );

}

function applyRuntimePreset( presetName, noticeLabel = '' ) {

	if ( ! presetManager || ! activeBackend ) return null;

	const resolvedPreset = applyPresetForBackend( presetManager, activeBackend, presetName );
	syncPresetUI( resolvedPreset );
	if ( activeBackend === BACKENDS.WEBGPU ) {

		const category = getPresetCategory( resolvedPreset );
		if ( category === 'modelFx' ) {

			ensureModelFXCompatibilityBackend();

		} else if ( category === 'shaderBuilder' ) {

			ensureShaderBuilderCompatibilityBackend();

		}

	} else if ( activeBackend === BACKENDS.WEBGL ) {

		syncWebGLSpecialPresetMode();

	}

	if ( noticeLabel ) {

		const displayName = PRESETS[ resolvedPreset ]?.name || resolvedPreset;
		showRuntimeNotice( `${ noticeLabel }: ${ displayName }`, 1800 );

	}

	return resolvedPreset;

}

function getActiveParticleCount() {

	if ( activeBackend === BACKENDS.WEBGPU && particleSystem ) {

		const uniforms = particleSystem.getUniforms?.();
		if ( uniforms?.activeParticleCount ) return Math.floor( uniforms.activeParticleCount.value );

	}

	if ( activeBackend === BACKENDS.WEBGL && compatibilitySystem ) {

		let total = Number.isFinite( compatibilitySystem.particleCount ) ? Math.floor( compatibilitySystem.particleCount ) : 0;
		if ( webglModelFXSystem && getPresetCategory( lastSelectedPreset ) === 'modelFx' ) {

			total += Math.floor( webglModelFXSystem.getState()?.activeCount || 0 );

		}
		if ( total > 0 ) return total;

		const uniforms = compatibilitySystem.getUniforms?.();
		if ( uniforms?.activeParticleCount ) return Math.floor( uniforms.activeParticleCount.value );

	}

	return 0;

}

function updateRuntimeModes( now, fps ) {

	if ( benchmarkModeState?.running ) {

		updateBenchmarkMode( now, fps );
		return;

	}

	if ( demoModeState ) {

		updateDemoMode( now );

	}

}

function updateDemoMode( now ) {

	if ( ! demoModeState || ! presetManager || ! activeBackend ) return;
	if ( now < demoModeState.nextSwitchAt ) return;

	demoModeState.index = ( demoModeState.index + 1 ) % demoModeState.presets.length;
	const presetKey = demoModeState.presets[ demoModeState.index ];
	applyRuntimePreset( presetKey, 'Demo' );
	demoModeState.nextSwitchAt = now + demoModeState.intervalMs;

}

function beginNextBenchmarkSample( now ) {

	if ( ! benchmarkModeState ) return;

	benchmarkModeState.index ++;
	if ( benchmarkModeState.index >= benchmarkModeState.presets.length ) {

		finalizeBenchmarkMode();
		return;

	}

	const presetKey = benchmarkModeState.presets[ benchmarkModeState.index ];
	const resolvedPreset = applyRuntimePreset(
		presetKey,
		`Benchmark ${ benchmarkModeState.index + 1 }/${ benchmarkModeState.presets.length }`
	);
	if ( ! resolvedPreset ) return;

	benchmarkModeState.activeSample = {
		presetKey: resolvedPreset,
		startAt: now,
		sampleStartsAt: now + benchmarkModeState.warmupMs,
		frameCount: 0,
		fpsSum: 0,
		minFps: Number.POSITIVE_INFINITY,
		maxFps: 0
	};

}

function updateBenchmarkMode( now, fps ) {

	if ( ! benchmarkModeState || ! benchmarkModeState.running ) return;

	if ( ! benchmarkModeState.activeSample ) {

		beginNextBenchmarkSample( now );
		return;

	}

	const sample = benchmarkModeState.activeSample;
	if ( now >= sample.sampleStartsAt ) {

		sample.frameCount ++;
		sample.fpsSum += fps;
		if ( fps < sample.minFps ) sample.minFps = fps;
		if ( fps > sample.maxFps ) sample.maxFps = fps;

	}

	if ( now - sample.startAt < benchmarkModeState.durationMs ) return;

	const avgFps = sample.frameCount > 0 ? sample.fpsSum / sample.frameCount : 0;
	benchmarkModeState.results.push( {
		presetKey: sample.presetKey,
		presetName: PRESETS[ sample.presetKey ]?.name || sample.presetKey,
		category: getPresetCategory( sample.presetKey ),
		backend: activeBackend || 'unknown',
		particles: getActiveParticleCount(),
		durationMs: benchmarkModeState.durationMs,
		warmupMs: benchmarkModeState.warmupMs,
		avgFps: Number( avgFps.toFixed( 2 ) ),
		minFps: Number( ( sample.frameCount > 0 ? sample.minFps : 0 ).toFixed( 2 ) ),
		maxFps: Number( ( sample.frameCount > 0 ? sample.maxFps : 0 ).toFixed( 2 ) ),
		samples: sample.frameCount
	} );

	beginNextBenchmarkSample( now );

}

function finalizeBenchmarkMode() {

	if ( ! benchmarkModeState ) return;

	benchmarkModeState.running = false;

	const results = benchmarkModeState.results;
	const avgOfAverages = results.length > 0
		? results.reduce( ( sum, row ) => sum + row.avgFps, 0 ) / results.length
		: 0;

	const payload = {
		generatedAt: new Date().toISOString(),
		backendRequested: requestedBackend,
		backendResolved: activeBackend,
		config: {
			durationMs: benchmarkModeState.durationMs,
			warmupMs: benchmarkModeState.warmupMs,
			scope: runtimeModeConfig.benchCategory
		},
		summary: {
			presetCount: results.length,
			avgFps: Number( avgOfAverages.toFixed( 2 ) )
		},
		results
	};

	window.__PARTICLE_BENCHMARK__ = payload;
	console.group( 'ParticleUniverse Benchmark Results' );
	console.table( results );
	console.log( payload );
	console.groupEnd();

	showRuntimeNotice(
		`Benchmark tamamlandi. Ortalama FPS: ${ payload.summary.avgFps } (${ payload.summary.presetCount } preset).`,
		4800
	);

}

function createScene( canvas ) {

	scene = new THREE.Scene();
	scene.background = new THREE.Color( 0x080208 );

	camera = new THREE.PerspectiveCamera(
		60,
		window.innerWidth / window.innerHeight,
		0.1,
		1000
	);
	camera.position.set( 0, 2.5, 8 );

	configureControls( canvas );

	gridHelper = new THREE.GridHelper( 20, 20, 0x222244, 0x111133 );
	gridHelper.material.transparent = true;
	gridHelper.material.opacity = 0.3;
	gridHelper.visible = false;
	scene.add( gridHelper );

}

function configureControls( canvas ) {

	if ( controls ) controls.dispose();

	controls = new OrbitControls( camera, canvas );
	controls.enableDamping = true;
	controls.dampingFactor = 0.08;
	controls.target.set( 0, 1.5, 0 );
	controls.minDistance = 1;
	controls.maxDistance = 50;
	controls.maxPolarAngle = Math.PI * 0.95;

}

function rebuildViewportCanvas( currentCanvas ) {

	const sourceCanvas = currentCanvas || document.getElementById( 'viewport' );
	if ( ! sourceCanvas ) throw new Error( 'Viewport canvas not found for rebuild.' );

	const rebuiltCanvas = document.createElement( 'canvas' );
	rebuiltCanvas.id = sourceCanvas.id;
	rebuiltCanvas.className = sourceCanvas.className;

	const parent = sourceCanvas.parentNode;
	if ( ! parent ) throw new Error( 'Viewport canvas parent not found.' );

	parent.replaceChild( rebuiltCanvas, sourceCanvas );
	configureControls( rebuiltCanvas );
	return rebuiltCanvas;

}

function configureRenderer( targetRenderer ) {

	targetRenderer.setPixelRatio( Math.min( window.devicePixelRatio, 2 ) );
	targetRenderer.setSize( window.innerWidth, window.innerHeight );
	targetRenderer.toneMapping = THREE.ACESFilmicToneMapping;
	targetRenderer.toneMappingExposure = 1.0;

}

async function initializeBackend( canvas ) {

	if ( requestedBackend === BACKENDS.WEBGL ) {

		await initWebGLCompatibility(
			canvas,
			'Compatibility mode active (?backend=webgl).',
			{ savePreference: true }
		);
		return;

	}

	try {

		await initWebGPUBackend( canvas );

	} catch ( error ) {

		const reason = getWebGPUFailureReason( error );

		if ( requestedBackend === BACKENDS.WEBGPU ) {

			console.warn( 'Forced WebGPU failed; switching to compatibility mode:', error );
			await initWebGLCompatibility(
				canvas,
				`Compatibility mode active: ${ reason }`,
				{ savePreference: true }
			);
			showRuntimeNotice( `WebGPU bu cihazda stabil degil (${ reason }). WebGL moda gecildi.` );
			return;

		}

		console.warn( 'WebGPU backend init failed; switching to compatibility mode:', error );

		await initWebGLCompatibility(
			canvas,
			`Compatibility mode active: ${ reason }`,
			{ savePreference: true }
		);
		showRuntimeNotice( `WebGPU baslatilamadi (${ reason }). WebGL compatibility aktif.` );

	}

}

async function initWebGPUBackend( canvas ) {

	if ( ! navigator.gpu ) {

		throw new Error( 'WebGPU is not available on this browser/device.' );

	}

	let candidateRenderer = null;
	let candidateParticleSystem = null;
	let candidatePostProcessing = null;
	let candidatePresetManager = null;

	try {

		candidateRenderer = new THREE.WebGPURenderer( { canvas, antialias: true } );
		configureRenderer( candidateRenderer );

		if ( typeof candidateRenderer.init === 'function' ) {

			await candidateRenderer.init();

		}

		candidateParticleSystem = new ParticleSystem( candidateRenderer, scene );
		await runWebGPUSmokeTest( candidateRenderer, candidateParticleSystem );
		candidatePostProcessing = new PostProcessingManager( candidateRenderer, scene, camera );
		candidatePresetManager = new PresetManager( candidateParticleSystem, { backend: BACKENDS.WEBGPU } );
		applyPresetForBackend( candidatePresetManager, BACKENDS.WEBGPU, lastSelectedPreset );

		const visibilityResult = runWebGPUVisibilitySmokeTest(
			candidateRenderer,
			candidateParticleSystem,
			candidatePostProcessing
		);

		if ( ! visibilityResult.validated ) {

			// Some environments pass WebGPU init/compute but fail post-processing output.
			// Retry with direct scene rendering before giving up on WebGPU.
			safeDisposePostProcessing( candidatePostProcessing );
			candidatePostProcessing = new CompatibilityPostProcessingManager( candidateRenderer, scene, camera );

			const noPostFxVisibilityResult = runWebGPUVisibilitySmokeTest(
				candidateRenderer,
				candidateParticleSystem,
				candidatePostProcessing
			);
			const probeUnavailable = noPostFxVisibilityResult.reason === 'probe-unavailable';

			if ( noPostFxVisibilityResult.validated ) {

				showRuntimeNotice( 'WebGPU post-processing devre disi birakildi (uyumluluk nedeni).' );

			} else if ( ! probeUnavailable ) {

				throw new Error( 'WebGPU visibility validation failed without post-processing.' );

			} else {

				showRuntimeNotice( 'WebGPU gorunurluk probe bu tarayicida kisitli; mevcut mod korunuyor.' );

			}

		}

		resetDynamicUI();

		disposeSystems();
		safeDisposeRenderer( renderer );

		renderer = candidateRenderer;
		particleSystem = candidateParticleSystem;
		compatibilitySystem = null;
		postProcessing = candidatePostProcessing;
		presetManager = candidatePresetManager;
		controlPanel = new ControlPanel(
			particleSystem,
			postProcessing,
			presetManager,
			{
				onPresetChange: handlePresetSelection,
				onShaderBuilderViewChange: ( view ) => {

					if ( shaderBuilderPanel ) shaderBuilderPanel.setView( view );

				}
			}
		);
		screenCapture = new ScreenCapture( renderer );

		runtimeFallbackUsed = false;
		noParticleFrameCount = 0;
		darkScreenProbeFailures = 0;
		lastPresetChangeTime = performance.now();
		webgpuRenderedFrameCount = 0;
		activeBackend = BACKENDS.WEBGPU;
		if ( requestedBackend === BACKENDS.AUTO ) setSavedBackendPreference( BACKENDS.WEBGPU );

		showAdvancedUI( true );
		setShaderBuilderUILayout( false );
		hideCompatibilityBanner();
		hideWebGPUWarning();
		setGPUInfo( 'WebGPU' );

		syncPresetUI( lastSelectedPreset );

	} catch ( error ) {

		safeDisposePostProcessing( candidatePostProcessing );
		if ( candidateParticleSystem ) candidateParticleSystem.dispose();
		safeDisposeRenderer( candidateRenderer );
		throw error;

	}

}

async function runWebGPUSmokeTest( targetRenderer, targetSystem ) {

	try {

		if ( typeof targetRenderer.computeAsync === 'function' ) {

			await targetRenderer.computeAsync( targetSystem.computeInit );

		} else {

			targetRenderer.compute( targetSystem.computeInit );

		}

	} catch ( error ) {

		try {

			targetRenderer.compute( targetSystem.computeInit );

		} catch ( syncError ) {

			throw new Error( `WebGPU compute init failed: ${ syncError.message || syncError }` );

		}

	}

	try {

		targetRenderer.compute( targetSystem.computeRespawn );
		targetRenderer.compute( targetSystem.computeForces );
		targetRenderer.compute( targetSystem.computeVisuals );

	} catch ( error ) {

		throw new Error( `WebGPU compute smoke-test failed: ${ error.message || error }` );

	}

}

async function initWebGLCompatibility( canvas, bannerText, options = {} ) {

	const savePreference = options.savePreference === true;

	disposeSystems();
	safeDisposeRenderer( renderer );

	const freshCanvas = rebuildViewportCanvas( canvas );
	renderer = await createCompatibilityRenderer( freshCanvas );
	configureRenderer( renderer );

	resetDynamicUI();
	compatibilitySystem = new WebGLCompatibilitySystem( scene, {
		particleCount: 20000,
		maxParticles: 100000
	} );
	webglVFXLab = new WebGLVFXLab( scene, camera );
	webglModelFXSystem = new WebGLModelFXSystem( scene, {
		maxParticles: 35000,
		defaultPointCount: 18000,
		modelOrigin: new THREE.Vector3( 0, 1.6, 0 ),
		fitSize: 3.2
	} );
	webglShaderBuilderSystem = new WebGLShaderBuilderSystem( scene, {
		maxSavedGraphs: 30
	} );
	webglShaderBuilderSystem.bindCanvas( renderer.domElement );
	postProcessing = new CompatibilityPostProcessingManager( renderer, scene, camera );
	presetManager = new PresetManager( compatibilitySystem, { backend: BACKENDS.WEBGL } );
	controlPanel = new ControlPanel(
		compatibilitySystem,
		postProcessing,
		presetManager,
		{
			onPresetChange: handlePresetSelection,
			onShaderBuilderViewChange: ( view ) => {

				if ( shaderBuilderPanel ) shaderBuilderPanel.setView( view );

			}
		}
	);
	modelFXPanel = new ModelFXPanel( document.getElementById( 'model-fx-panel-container' ), {
		onLoadFile: async ( file ) => {

			if ( ! webglModelFXSystem ) return;
			try {

				await webglModelFXSystem.loadFromFile( file );
				modelFXPanel?.sync( webglModelFXSystem.getState() );
				showRuntimeNotice( `Model yuklendi: ${ file.name }` );

			} catch ( error ) {

				console.warn( 'Model FX file load failed:', error );
				showRuntimeNotice( `Model yuklenemedi: ${ error.message || error }` );

			}

		},
		onLoadDemo: async ( demoId ) => {

			if ( ! webglModelFXSystem ) return;
			await webglModelFXSystem.loadDemo( demoId );
			modelFXPanel?.sync( webglModelFXSystem.getState() );
			showRuntimeNotice( `Demo model aktif: ${ demoId }` );

		},
		onParamsChange: ( partial ) => {

			if ( ! webglModelFXSystem ) return;
			webglModelFXSystem.setParams( partial );
			modelFXPanel?.sync( webglModelFXSystem.getState() );

		},
		onResetModel: async () => {

			if ( ! webglModelFXSystem ) return;
			await webglModelFXSystem.loadDemo( 'torusKnot' );
			modelFXPanel?.sync( webglModelFXSystem.getState() );
			showRuntimeNotice( 'Model FX demo modeli sifirlandi.' );

		},
		onResetParams: () => {

			if ( ! webglModelFXSystem ) return;
			webglModelFXSystem.applyPreset( lastSelectedPreset );
			modelFXPanel?.sync( webglModelFXSystem.getState() );
			showRuntimeNotice( 'Model FX parametreleri preset varsayilanina dondu.' );

		}
	} );
	modelFXPanel.setVisible( false );
		shaderBuilderPanel = new ShaderBuilderPanel( document.getElementById( 'shader-builder-workspace' ), {
		onNodeTierChange: ( tier ) => {

			if ( tier === 'advanced' ) showRuntimeNotice( 'Advanced node set aktif.' );

		},
		onApplyTemplate: ( templateId ) => {

			if ( ! webglShaderBuilderSystem ) return;
			const ok = webglShaderBuilderSystem.applyTemplate( templateId );
			const state = webglShaderBuilderSystem.getState();
			shaderBuilderPanel?.sync( state );
			if ( ok ) {

				if ( state.activeRenderMode && state.activeRenderMode !== 'graph' ) {

					showRuntimeNotice( `${ state.activeRenderMode } aktif: ${ templateId }` );

				} else {

					showRuntimeNotice( `Shader template aktif: ${ templateId }` );

				}

			}
			else showRuntimeNotice( webglShaderBuilderSystem.getState().lastError || 'Template compile basarisiz.' );

		},
		onCompile: ( graph ) => {

			if ( ! webglShaderBuilderSystem ) return false;
			const ok = webglShaderBuilderSystem.applyGraph( graph );
			shaderBuilderPanel?.sync( webglShaderBuilderSystem.getState() );
			if ( ! ok ) throw new Error( webglShaderBuilderSystem.getState().lastError || 'Shader compile basarisiz.' );
			return true;

		},
		onParamsChange: ( partial ) => {

			if ( ! webglShaderBuilderSystem ) return;
			webglShaderBuilderSystem.setParams( partial );
			shaderBuilderPanel?.sync( webglShaderBuilderSystem.getState() );

		},
		onOceanProParamsChange: ( partial ) => {

			if ( ! webglShaderBuilderSystem ) return;
			webglShaderBuilderSystem.setOceanProParams( partial );
			shaderBuilderPanel?.sync( webglShaderBuilderSystem.getState() );

		},
		onFireProParamsChange: ( partial ) => {

			if ( ! webglShaderBuilderSystem ) return;
			webglShaderBuilderSystem.setFireProParams( partial );
			shaderBuilderPanel?.sync( webglShaderBuilderSystem.getState() );

		},
		onPreviewSettingsChange: ( partial ) => {

			if ( ! webglShaderBuilderSystem ) return;
			webglShaderBuilderSystem.setPreviewSettings( partial );
			shaderBuilderPanel?.sync( webglShaderBuilderSystem.getState() );

		},
		onApplyLightingRig: ( rigId ) => {

			if ( ! webglShaderBuilderSystem ) return;
			webglShaderBuilderSystem.setLightingRigPreset( rigId );
			shaderBuilderPanel?.sync( webglShaderBuilderSystem.getState() );
			showRuntimeNotice( `Lighting rig aktif: ${ rigId }` );

		},
		onTextureUpload: async ( slot, file ) => {

			if ( ! webglShaderBuilderSystem ) return;
			try {

				await webglShaderBuilderSystem.setTextureFromFile( slot, file );
				shaderBuilderPanel?.sync( webglShaderBuilderSystem.getState() );
				showRuntimeNotice( `Texture ${ slot.toUpperCase() } yuklendi: ${ file.name }` );

			} catch ( error ) {

				showRuntimeNotice( `Texture yuklenemedi: ${ error?.message || error }` );

			}

		},
		onTextureClear: ( slot ) => {

			if ( ! webglShaderBuilderSystem ) return;
			webglShaderBuilderSystem.clearTextureSlot( slot );
			shaderBuilderPanel?.sync( webglShaderBuilderSystem.getState() );
			showRuntimeNotice( `Texture ${ slot.toUpperCase() } sifirlandi.` );

		},
		onSetExposedParams: ( nodeIds ) => {

			if ( ! webglShaderBuilderSystem ) return;
			webglShaderBuilderSystem.setExposedParamIds( nodeIds );
			shaderBuilderPanel?.sync( webglShaderBuilderSystem.getState() );

		},
		onSetDynamicParam: ( nodeId, value ) => {

			if ( ! webglShaderBuilderSystem ) return;
			const ok = webglShaderBuilderSystem.setDynamicParam( nodeId, value, { persist: true } );
			if ( ok ) shaderBuilderPanel?.sync( webglShaderBuilderSystem.getState() );

		},
		onTimelineSettingsChange: ( partial ) => {

			if ( ! webglShaderBuilderSystem ) return;
			webglShaderBuilderSystem.setTimelineSettings( partial );
			shaderBuilderPanel?.sync( webglShaderBuilderSystem.getState() );

		},
		onTimelineTrackChange: ( nodeId, track ) => {

			if ( ! webglShaderBuilderSystem ) return;
			webglShaderBuilderSystem.setTimelineTrack( nodeId, track );
			shaderBuilderPanel?.sync( webglShaderBuilderSystem.getState() );

		},
		onTimelineSeek: ( time ) => {

			if ( ! webglShaderBuilderSystem ) return;
			webglShaderBuilderSystem.seekTimeline( time );
			shaderBuilderPanel?.sync( webglShaderBuilderSystem.getState() );

		},
		onSave: ( name ) => {

			if ( ! webglShaderBuilderSystem ) return;
			const saved = webglShaderBuilderSystem.saveCurrentGraph( name || 'Custom Shader Graph' );
			shaderBuilderPanel?.sync( webglShaderBuilderSystem.getState() );
			showRuntimeNotice( `Shader graph kaydedildi: ${ saved?.name || name }` );

		},
		onLoadSaved: ( graphId ) => {

			if ( ! webglShaderBuilderSystem ) return;
			const loaded = webglShaderBuilderSystem.loadSavedGraph( graphId );
			shaderBuilderPanel?.sync( webglShaderBuilderSystem.getState() );
			showRuntimeNotice( `Shader graph yuklendi: ${ loaded.name }` );

		},
		onDeleteSaved: ( graphId ) => {

			if ( ! webglShaderBuilderSystem ) return;
			const deleted = webglShaderBuilderSystem.deleteSavedGraph( graphId );
			shaderBuilderPanel?.sync( webglShaderBuilderSystem.getState() );
			if ( deleted ) showRuntimeNotice( 'Kayitli shader graph silindi.' );

		},
		onExport: () => {

			if ( ! webglShaderBuilderSystem ) return;
			const payload = webglShaderBuilderSystem.exportCurrentGraph();
			const blob = new Blob( [ payload ], { type: 'application/json' } );
			const url = URL.createObjectURL( blob );
			const link = document.createElement( 'a' );
			link.href = url;
			link.download = `shader-graph-${ Date.now() }.json`;
			document.body.appendChild( link );
			link.click();
			document.body.removeChild( link );
			URL.revokeObjectURL( url );
			showRuntimeNotice( 'Shader graph JSON export edildi.' );

		},
		onImport: ( serialized ) => {

			if ( ! webglShaderBuilderSystem ) return;
			const imported = webglShaderBuilderSystem.importGraph( serialized );
			shaderBuilderPanel?.sync( webglShaderBuilderSystem.getState() );
			showRuntimeNotice( `Shader graph import edildi: ${ imported.name }` );

		},
		onResetTemplate: () => {

			if ( ! webglShaderBuilderSystem ) return;
			const category = getPresetCategory( lastSelectedPreset );
			const templatePreset = category === 'shaderBuilder' ? lastSelectedPreset : 'shaderNeonTornado';
			webglShaderBuilderSystem.applyPreset( templatePreset );
			shaderBuilderPanel?.sync( webglShaderBuilderSystem.getState() );
			showRuntimeNotice( 'Shader Builder template sifirlandi.' );

		}
	} );
	shaderBuilderPanel.setVisible( false );
	screenCapture = new ScreenCapture( renderer );
	activeBackend = BACKENDS.WEBGL;
	noParticleFrameCount = 0;
	darkScreenProbeFailures = 0;
	webgpuRenderedFrameCount = 0;

	showAdvancedUI( true );
	setShaderBuilderUILayout( false );
	hideWebGPUWarning();
	showCompatibilityBanner( bannerText || 'Compatibility mode active: quality reduced.' );
	setGPUInfo( 'WebGL (Compatibility)' );
	applyPresetForBackend( presetManager, BACKENDS.WEBGL, lastSelectedPreset );
	syncPresetUI( lastSelectedPreset );
	syncWebGLSpecialPresetMode();
	if ( savePreference ) setSavedBackendPreference( BACKENDS.WEBGL );

}

async function createCompatibilityRenderer( canvas ) {

	if ( typeof THREE_WEBGL.WebGLRenderer === 'function' ) {

		return new THREE_WEBGL.WebGLRenderer( { canvas, antialias: true } );

	}

	if ( typeof THREE.WebGPURenderer === 'function' ) {

		const fallbackRenderer = new THREE.WebGPURenderer( {
			canvas,
			antialias: true,
			forceWebGL: true
		} );

		if ( typeof fallbackRenderer.init === 'function' ) {

			await fallbackRenderer.init();

		}

		return fallbackRenderer;

	}

	throw new Error( 'No compatible renderer constructor found for WebGL fallback.' );

}

function runWebGPUVisibilitySmokeTest( targetRenderer, targetSystem, targetPostProcessing ) {

	// Hide particle mesh so it doesn't interfere with the test
	const particleMesh = targetSystem.mesh;
	const savedVisible = particleMesh ? particleMesh.visible : true;
	if ( particleMesh ) particleMesh.visible = false;

	// Create a bright test plane at the orbit target, facing the camera
	const testGeometry = new THREE.PlaneGeometry( 4, 4 );
	const testMaterial = new THREE.MeshBasicMaterial( { color: 0xff00ff, side: THREE.DoubleSide } );
	const testMesh = new THREE.Mesh( testGeometry, testMaterial );
	testMesh.position.set( 0, 1.5, 0 );
	if ( camera ) testMesh.lookAt( camera.position );
	scene.add( testMesh );

	let maxVisibleRatio = 0;
	let sampledFrameCount = 0;

	for ( let i = 0; i < 4; i ++ ) {

		targetPostProcessing.render();

		const visibleRatio = estimateVisiblePixelRatio( targetRenderer.domElement );
		if ( visibleRatio < 0 ) continue;

		sampledFrameCount ++;
		if ( visibleRatio > maxVisibleRatio ) maxVisibleRatio = visibleRatio;

	}

	// Clean up test mesh
	scene.remove( testMesh );
	testGeometry.dispose();
	testMaterial.dispose();

	// Restore particle mesh visibility
	if ( particleMesh ) particleMesh.visible = savedVisible;

	if ( sampledFrameCount === 0 ) {

		console.warn( 'Visibility probe unavailable; skipping pixel-ratio validation.' );
		return { validated: false, ratio: - 1, geometrySignal: 0, reason: 'probe-unavailable' };

	}

	if ( maxVisibleRatio < 0.005 ) {

		console.warn( `WebGPU visibility probe low ratio (${ maxVisibleRatio.toFixed( 6 ) }).` );
		return { validated: false, ratio: maxVisibleRatio, geometrySignal: 0, reason: 'ratio-low' };

	}

	return { validated: true, ratio: maxVisibleRatio, geometrySignal: 0, reason: 'ok' };

}

function estimateVisiblePixelRatio( sourceCanvas ) {

	if ( ! sourceCanvas ) return - 1;

	if ( ! probeCanvas ) {

		probeCanvas = document.createElement( 'canvas' );
		probeCanvas.width = 56;
		probeCanvas.height = 56;
		probeContext = probeCanvas.getContext( '2d', { willReadFrequently: true } );

	}

	if ( ! probeContext ) return - 1;

	try {

		probeContext.clearRect( 0, 0, probeCanvas.width, probeCanvas.height );
		probeContext.drawImage( sourceCanvas, 0, 0, probeCanvas.width, probeCanvas.height );

		const pixels = probeContext.getImageData( 0, 0, probeCanvas.width, probeCanvas.height ).data;
		let visibleCount = 0;
		let hasAnyColorData = false;

		for ( let i = 0; i < pixels.length; i += 4 ) {

			const r = pixels[ i ];
			const g = pixels[ i + 1 ];
			const b = pixels[ i + 2 ];
			const a = pixels[ i + 3 ];
			if ( r !== 0 || g !== 0 || b !== 0 || a !== 0 ) hasAnyColorData = true;
			const delta = Math.abs( r - 8 ) + Math.abs( g - 2 ) + Math.abs( b - 8 );
			const luminance = r + g + b;

			if ( delta > 24 && luminance > 18 ) visibleCount ++;

		}

		if ( ! hasAnyColorData ) return - 1;

		return visibleCount / ( probeCanvas.width * probeCanvas.height );

	} catch ( error ) {

		console.warn( 'Visibility probe failed, skipping pixel validation:', error );
		return - 1;

	}

}

function disposeSystems() {

	if ( particleSystem ) {

		particleSystem.dispose();
		particleSystem = null;

	}

	if ( compatibilitySystem ) {

		compatibilitySystem.dispose();
		compatibilitySystem = null;

	}

	if ( postProcessing ) {

		safeDisposePostProcessing( postProcessing );
		postProcessing = null;

	}

	if ( webglVFXLab ) {

		webglVFXLab.dispose();
		webglVFXLab = null;

	}

	if ( webglModelFXSystem ) {

		webglModelFXSystem.dispose();
		webglModelFXSystem = null;

	}

	if ( webglShaderBuilderSystem ) {

		webglShaderBuilderSystem.dispose();
		webglShaderBuilderSystem = null;

	}

	if ( modelFXPanel ) {

		modelFXPanel.dispose();
		modelFXPanel = null;

	}

	if ( shaderBuilderPanel ) {

		shaderBuilderPanel.dispose();
		shaderBuilderPanel = null;

	}

	vfxOverlayActive = false;
	pendingModelSwitch = false;
	pendingShaderBuilderSwitch = false;

}

function resetDynamicUI() {

	const presetContainer = document.getElementById( 'preset-container' );
	const guiContainer = document.getElementById( 'gui-container' );
	const gradientContainer = document.getElementById( 'gradient-editor-container' );
	const sizeCurveContainer = document.getElementById( 'size-curve-container' );
	const opacityCurveContainer = document.getElementById( 'opacity-curve-container' );
	const modelFxPanelContainer = document.getElementById( 'model-fx-panel-container' );
	const shaderBuilderWorkspace = document.getElementById( 'shader-builder-workspace' );

	if ( presetContainer ) presetContainer.innerHTML = '';
	if ( guiContainer ) guiContainer.innerHTML = '';
	if ( gradientContainer ) gradientContainer.innerHTML = '';
	if ( sizeCurveContainer ) sizeCurveContainer.innerHTML = '';
	if ( opacityCurveContainer ) opacityCurveContainer.innerHTML = '';
	if ( modelFxPanelContainer ) modelFxPanelContainer.innerHTML = '';
	if ( shaderBuilderWorkspace ) shaderBuilderWorkspace.innerHTML = '';

}

function safeDisposeRenderer( targetRenderer ) {

	if ( ! targetRenderer ) return;

	try {

		targetRenderer.setAnimationLoop( null );

	} catch ( e ) {

		console.warn( 'Animation loop cleanup warning:', e );

	}

	if ( typeof targetRenderer.dispose === 'function' ) {

		try {

			targetRenderer.dispose();

		} catch ( e ) {

			console.warn( 'Renderer dispose warning:', e );

		}

	}

}

function safeDisposePostProcessing( targetPostProcessing ) {

	if ( ! targetPostProcessing ) return;

	if ( typeof targetPostProcessing.dispose === 'function' ) {

		try {

			targetPostProcessing.dispose();

		} catch ( e ) {

			console.warn( 'PostProcessing dispose warning:', e );

		}

	}

}

function activatePresetButton( presetName ) {

	document.querySelectorAll( '.preset-btn' ).forEach( ( button ) => {

		button.classList.toggle( 'active', button.dataset.preset === presetName );

	} );

}

function showAdvancedUI( visible ) {

	const presetContainer = document.getElementById( 'preset-container' );
	const presetTabs = document.getElementById( 'preset-tabs' );
	const controlPanelElement = document.getElementById( 'control-panel' );
	const togglePanelButton = document.getElementById( 'toggle-panel' );

	if ( presetContainer ) presetContainer.style.display = visible ? '' : 'none';
	if ( presetTabs ) presetTabs.style.display = visible ? '' : 'none';
	if ( controlPanelElement ) controlPanelElement.style.display = visible ? '' : 'none';
	if ( togglePanelButton ) togglePanelButton.style.display = visible ? '' : 'none';

}

function setWidgetSectionVisibility( containerId, visible ) {

	const container = document.getElementById( containerId );
	if ( ! container ) return;
	const section = container.closest( '.widget-section' ) || container;
	section.style.display = visible ? '' : 'none';

}

function setShaderBuilderUILayout( enabled ) {

	const controlPanelElement = document.getElementById( 'control-panel' );
	const togglePanelButton = document.getElementById( 'toggle-panel' );
	const workspace = document.getElementById( 'shader-builder-workspace' );

	if ( controlPanelElement ) controlPanelElement.style.display = enabled ? 'none' : '';
	if ( togglePanelButton ) togglePanelButton.style.display = enabled ? 'none' : '';
	if ( workspace ) workspace.classList.toggle( 'hidden', ! enabled );

	const guiContainer = document.getElementById( 'gui-container' );
	if ( guiContainer ) guiContainer.style.display = enabled ? 'none' : '';

	setWidgetSectionVisibility( 'gradient-editor-container', ! enabled );
	setWidgetSectionVisibility( 'size-curve-container', ! enabled );
	setWidgetSectionVisibility( 'opacity-curve-container', ! enabled );
	setWidgetSectionVisibility( 'model-fx-panel-container', ! enabled );

}

function showCompatibilityBanner( text ) {

	const banner = document.getElementById( 'compatibility-banner' );
	if ( ! banner ) return;

	banner.textContent = text;
	banner.classList.add( 'visible' );

}

function hideCompatibilityBanner() {

	const banner = document.getElementById( 'compatibility-banner' );
	if ( ! banner ) return;

	banner.classList.remove( 'visible' );

}

function showWebGPUWarning( message ) {

	const warning = document.getElementById( 'webgpu-warning' );
	if ( ! warning ) return;

	const text = warning.querySelector( 'p' );
	if ( text ) {

		text.textContent = message || 'WebGPU backend failed to initialize.';

	}

	warning.style.display = 'block';

}

function hideWebGPUWarning() {

	const warning = document.getElementById( 'webgpu-warning' );
	if ( warning ) warning.style.display = 'none';

}

function hideLoading() {

	const loading = document.getElementById( 'loading' );
	if ( ! loading ) return;

	loading.classList.add( 'hidden' );
	setTimeout( () => { loading.style.display = 'none'; }, 600 );

}

function setGPUInfo( label ) {

	const gpuValue = document.getElementById( 'gpu-value' );
	if ( gpuValue ) gpuValue.textContent = label;

	if ( controlPanel ) controlPanel.setGPUInfo( label );

}

function setParticleCount( count ) {

	const particleValue = document.getElementById( 'particle-value' );
	if ( particleValue ) particleValue.textContent = count.toLocaleString();

}

function updateCompatibilityStats( fps ) {

	const fpsValue = document.getElementById( 'fps-value' );
	if ( fpsValue ) {

		fpsValue.textContent = Math.round( fps );
		fpsValue.style.color = fps >= 55 ? '#4ecdc4' : fps >= 30 ? '#ffe66d' : '#ff6b6b';

	}

	if ( compatibilitySystem ) {

		let totalParticles = Math.floor( compatibilitySystem.particleCount || 0 );
		if ( webglModelFXSystem && getPresetCategory( lastSelectedPreset ) === 'modelFx' ) {

			totalParticles += Math.floor( webglModelFXSystem.getState()?.activeCount || 0 );

		}
		setParticleCount( totalParticles );

	}

}

function setupButtons() {

	if ( buttonsBound ) return;
	buttonsBound = true;

	const btnScreenshot = document.getElementById( 'btn-screenshot' );
	if ( btnScreenshot ) {

		btnScreenshot.addEventListener( 'click', () => {

			if ( screenCapture ) screenCapture.takeScreenshot();

		} );

	}

	const btnRecord = document.getElementById( 'btn-record' );
	if ( btnRecord ) {

		btnRecord.addEventListener( 'click', () => {

			if ( ! screenCapture ) return;
			const isRecording = screenCapture.toggleRecording();
			btnRecord.classList.toggle( 'active', isRecording );
			btnRecord.classList.toggle( 'recording', isRecording );

		} );

	}

	const btnGrid = document.getElementById( 'btn-grid' );
	if ( btnGrid ) {

		btnGrid.addEventListener( 'click', () => {

			gridHelper.visible = ! gridHelper.visible;
			btnGrid.classList.toggle( 'active', gridHelper.visible );

		} );

	}

	const btnFullscreen = document.getElementById( 'btn-fullscreen' );
	if ( btnFullscreen ) {

		btnFullscreen.addEventListener( 'click', () => {

			if ( document.fullscreenElement ) {

				document.exitFullscreen();
				btnFullscreen.classList.remove( 'active' );

			} else {

				document.body.requestFullscreen();
				btnFullscreen.classList.add( 'active' );

			}

		} );

	}

	document.addEventListener( 'keydown', ( e ) => {

		if ( e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' ) return;

		switch ( e.key.toLowerCase() ) {

			case 's':
				if ( ! e.ctrlKey && ! e.metaKey && screenCapture ) screenCapture.takeScreenshot();
				break;
			case 'r':
				if ( ! e.ctrlKey && ! e.metaKey && screenCapture ) {

					const isRecording = screenCapture.toggleRecording();
					if ( btnRecord ) {

						btnRecord.classList.toggle( 'active', isRecording );
						btnRecord.classList.toggle( 'recording', isRecording );

					}

				}
				break;
			case 'g':
				gridHelper.visible = ! gridHelper.visible;
				if ( btnGrid ) btnGrid.classList.toggle( 'active', gridHelper.visible );
				break;
			case 'f':
				if ( ! e.ctrlKey && ! e.metaKey ) {

					if ( document.fullscreenElement ) {

						document.exitFullscreen();

					} else {

						document.body.requestFullscreen();

					}

				}
				break;

		}

	} );

}

function tryRuntimeFallback( error ) {

	if ( requestedBackend !== BACKENDS.AUTO || runtimeFallbackUsed ) return false;

	runtimeFallbackUsed = true;
	console.warn( 'Runtime WebGPU failure, switching to WebGL compatibility:', error );

	const canvas = renderer ? renderer.domElement : document.getElementById( 'viewport' );
	activeBackend = null;

	initWebGLCompatibility(
		canvas,
		'Compatibility mode active: WebGPU runtime error.',
		{ savePreference: true }
	)
		.then( () => {

			if ( renderer ) renderer.setAnimationLoop( animate );

		} )
		.catch( ( fallbackError ) => {

			console.error( 'Failed to switch to compatibility mode:', fallbackError );

		} );

	return true;

}

function animate() {

	const now = performance.now();
	const delta = ( now - lastTime ) / 1000;
	lastTime = now;

	if ( controls ) controls.update();

	let rendered = false;

	if ( activeBackend === BACKENDS.WEBGPU && renderer && particleSystem && postProcessing ) {

		try {

			particleSystem.updateFrameSeed();
			renderer.compute( particleSystem.computeRespawn );
			renderer.compute( particleSystem.computeForces );
			renderer.compute( particleSystem.computeVisuals );
			postProcessing.render();
			rendered = true;
			webgpuRenderedFrameCount ++;

			const renderInfo = renderer?.info?.render || {};
			const geometrySignal = ( renderInfo.triangles ?? 0 ) + ( renderInfo.points ?? 0 ) + ( renderInfo.lines ?? 0 );
			// Fullscreen post-pass alone is typically ~2 triangles. If rendered geometry stays near-empty,
			// particle draw likely failed and auto-mode should switch to compatibility renderer.
			if ( geometrySignal <= 4 ) {

				noParticleFrameCount ++;
				if ( requestedBackend === BACKENDS.AUTO && noParticleFrameCount > 60 ) {

					console.warn( 'No particle geometry detected in WebGPU mode, switching to compatibility mode.' );
					if ( tryRuntimeFallback( new Error( 'No particle geometry detected.' ) ) ) return;

				}

			} else {

				noParticleFrameCount = 0;

			}

			if ( requestedBackend === BACKENDS.AUTO && webgpuRenderedFrameCount > 300 && webgpuRenderedFrameCount % 12 === 0 ) {

				// Skip dark-screen probing for 5 seconds after a preset change to allow particle respawn
				const timeSincePresetChange = now - lastPresetChangeTime;
				if ( timeSincePresetChange < 5000 ) {

					darkScreenProbeFailures = 0;

				} else {

					const visibleRatio = estimateVisiblePixelRatio( renderer.domElement );
					if ( visibleRatio < 0 ) {

						darkScreenProbeFailures = 0;

					} else if ( visibleRatio < 0.0010 ) {

						darkScreenProbeFailures ++;
						if ( darkScreenProbeFailures >= 5 ) {

							console.warn( 'WebGPU output remained near-black, switching to compatibility mode.' );
							if ( tryRuntimeFallback( new Error( `Near-black output (ratio=${ visibleRatio.toFixed( 6 ) })` ) ) ) return;

						}

					} else {

						darkScreenProbeFailures = 0;

					}

				}

			}

		} catch ( error ) {

			console.error( 'WebGPU compute error:', error );
			if ( tryRuntimeFallback( error ) ) return;

		}

		} else if ( activeBackend === BACKENDS.WEBGL && renderer && compatibilitySystem ) {

		if ( webglVFXLab ) webglVFXLab.update( delta );
		if ( webglModelFXSystem ) webglModelFXSystem.update( delta );
		if ( webglShaderBuilderSystem ) webglShaderBuilderSystem.update( delta, renderer );
		compatibilitySystem.update( delta );
			if ( postProcessing ) postProcessing.render();
			else renderer.render( scene, camera );
			if ( webglShaderBuilderSystem ) webglShaderBuilderSystem.renderOverlay( renderer );
			if ( shaderBuilderPanel ) shaderBuilderPanel.updatePreview( renderer.domElement );
			rendered = true;

		}

	if ( ! rendered ) return;

	const fps = delta > 0 ? 1 / delta : 60;
	updateRuntimeModes( now, fps );
	fpsHistory.push( fps );
	if ( fpsHistory.length > 30 ) fpsHistory.shift();
	const avgFps = fpsHistory.reduce( ( sum, value ) => sum + value, 0 ) / fpsHistory.length;

	if ( fpsHistory.length % 10 === 0 ) {

		if ( controlPanel ) {

			controlPanel.updateStats( avgFps );
			if ( activeBackend === BACKENDS.WEBGL ) updateCompatibilityStats( avgFps );

		} else {

			updateCompatibilityStats( avgFps );

		}

	}

}

function onWindowResize() {

	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();

	if ( renderer ) renderer.setSize( window.innerWidth, window.innerHeight );

}

init().catch( ( err ) => {

	console.error( 'Failed to initialize:', err );

	const loading = document.getElementById( 'loading' );
	if ( loading ) {

		loading.textContent = 'Error: ' + err.message;

	}

} );
