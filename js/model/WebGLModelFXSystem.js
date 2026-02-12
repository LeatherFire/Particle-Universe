import * as THREE from 'three/webgl';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshSurfaceSampler } from 'three/addons/math/MeshSurfaceSampler.js';

const DEFAULT_MAX_PARTICLES = 35000;
const DEFAULT_POINT_COUNT = 18000;
const DEFAULT_FIT_SIZE = 3.2;

const MODEL_FX_PRESET_CONFIGS = {
	modelReveal: {
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
		colorA: '#ffd38f',
		colorB: '#ff8d3a',
		burstImpulse: 0.55
	},
	modelSwarm: {
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
		colorA: '#8fd9ff',
		colorB: '#4a76ff',
		burstImpulse: 1.3
	},
	modelPulse: {
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
		colorA: '#f8fbff',
		colorB: '#75d8ff',
		burstImpulse: 0.8
	},
	modelShatter: {
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
		colorA: '#ffd0a3',
		colorB: '#ff5a47',
		burstImpulse: 2.3
	}
};

const DEMO_MODEL_DEFINITIONS = [
	{ id: 'torusKnot', name: 'Torus Knot' },
	{ id: 'crystal', name: 'Crystal' },
	{ id: 'helix', name: 'Helix' }
];

function clamp( value, minValue, maxValue ) {

	return Math.max( minValue, Math.min( maxValue, value ) );

}

function clampNumber( value, minValue, maxValue, fallback ) {

	const parsed = Number( value );
	if ( ! Number.isFinite( parsed ) ) return fallback;
	return clamp( parsed, minValue, maxValue );

}

function cloneMaterialColor( hex ) {

	try {

		return new THREE.Color( hex );

	} catch ( error ) {

		return new THREE.Color( '#ffffff' );

	}

}

function getTriangleWeight( geometry ) {

	if ( ! geometry ) return 1;
	if ( geometry.index ) return Math.max( 1, Math.floor( geometry.index.count / 3 ) );
	const position = geometry.getAttribute( 'position' );
	return position ? Math.max( 1, Math.floor( position.count / 3 ) ) : 1;

}

function disposeMaterial( material ) {

	if ( ! material ) return;
	if ( Array.isArray( material ) ) {

		for ( let i = 0; i < material.length; i ++ ) disposeMaterial( material[ i ] );
		return;

	}
	if ( typeof material.dispose === 'function' ) material.dispose();

}

function disposeObjectResources( root ) {

	if ( ! root ) return;
	root.traverse( ( child ) => {

		if ( child.geometry && typeof child.geometry.dispose === 'function' ) child.geometry.dispose();
		if ( child.material ) disposeMaterial( child.material );

	} );

}

function createDemoRoot( demoId ) {

	const root = new THREE.Group();
	root.name = `model-fx-demo-${ demoId }`;
	const material = new THREE.MeshBasicMaterial( { color: 0xffffff } );
	let mesh = null;

	if ( demoId === 'crystal' ) {

		mesh = new THREE.Mesh( new THREE.OctahedronGeometry( 1.2, 2 ), material );
		mesh.rotation.set( 0.2, Math.PI * 0.25, 0 );

	} else if ( demoId === 'helix' ) {

		const points = [];
		const turns = 3.5;
		const samples = 96;
		for ( let i = 0; i <= samples; i ++ ) {

			const t = i / samples;
			const angle = t * Math.PI * 2 * turns;
			const radius = 0.45 + t * 0.75;
			points.push( new THREE.Vector3(
				Math.cos( angle ) * radius,
				( t - 0.5 ) * 2.6,
				Math.sin( angle ) * radius
			) );

		}

		const curve = new THREE.CatmullRomCurve3( points );
		mesh = new THREE.Mesh(
			new THREE.TubeGeometry( curve, 220, 0.1, 14, false ),
			material
		);

	} else {

		mesh = new THREE.Mesh( new THREE.TorusKnotGeometry( 1.0, 0.35, 260, 32 ), material );
		mesh.rotation.set( 0.25, Math.PI * 0.2, 0 );

	}

	root.add( mesh );
	root.updateMatrixWorld( true );
	return root;

}

function parseGLTFAsync( loader, arrayBuffer ) {

	if ( typeof loader.parseAsync === 'function' ) {

		return loader.parseAsync( arrayBuffer, '' );

	}

	return new Promise( ( resolve, reject ) => {

		loader.parse( arrayBuffer, '', resolve, reject );

	} );

}

export class WebGLModelFXSystem {

	constructor( scene, options = {} ) {

		this.scene = scene;
		this.maxParticles = clampNumber( options.maxParticles, 1000, 100000, DEFAULT_MAX_PARTICLES );
		this.defaultPointCount = clampNumber( options.defaultPointCount, 1000, this.maxParticles, DEFAULT_POINT_COUNT );
		this.fitSize = clampNumber( options.fitSize, 0.5, 12.0, DEFAULT_FIT_SIZE );
		this.modelOrigin = ( options.modelOrigin || new THREE.Vector3( 0, 1.6, 0 ) ).clone();
		this.loader = new GLTFLoader();

		this.params = {
			samplingMode: 'surface',
			pointCount: this.defaultPointCount,
			attraction: 6.8,
			noiseStrength: 0.8,
			noiseScale: 1.35,
			noiseSpeed: 1.2,
			orbitStrength: 0.6,
			damping: 2.4,
			pointSize: 0.055,
			jitter: 0.18,
			pulseStrength: 0.08,
			pulseSpeed: 1.2
		};

		this.activePreset = 'modelReveal';
		this.activeDemoId = 'torusKnot';
		this.sourceLabel = 'Demo: Torus Knot';
		this.sourceType = 'demo';
		this.sourceRoot = null;
		this.sourceDisposable = false;
		this.targetCount = 0;
		this.activeCount = 0;
		this.time = 0;
		this.enabled = false;
		this.loadToken = 0;
		this.colorA = cloneMaterialColor( '#ffd38f' );
		this.colorB = cloneMaterialColor( '#ff8d3a' );

		this.positions = new Float32Array( this.maxParticles * 3 );
		this.velocities = new Float32Array( this.maxParticles * 3 );
		this.baseTargets = new Float32Array( this.maxParticles * 3 );
		this.colors = new Float32Array( this.maxParticles * 3 );
		this.phases = new Float32Array( this.maxParticles );

		this.geometry = new THREE.BufferGeometry();
		this.positionAttribute = new THREE.BufferAttribute( this.positions, 3 );
		this.positionAttribute.setUsage( THREE.DynamicDrawUsage );
		this.colorAttribute = new THREE.BufferAttribute( this.colors, 3 );
		this.colorAttribute.setUsage( THREE.DynamicDrawUsage );
		this.geometry.setAttribute( 'position', this.positionAttribute );
		this.geometry.setAttribute( 'color', this.colorAttribute );
		this.geometry.setDrawRange( 0, 0 );

		this.material = new THREE.PointsMaterial( {
			size: this.params.pointSize,
			sizeAttenuation: true,
			transparent: true,
			opacity: 0.95,
			depthWrite: false,
			vertexColors: true,
			blending: THREE.AdditiveBlending
		} );
		this.material.alphaTest = 0.01;

		this.points = new THREE.Points( this.geometry, this.material );
		this.points.frustumCulled = false;
		this.points.renderOrder = 16;

		this.group = new THREE.Group();
		this.group.name = 'webgl-model-fx';
		this.group.renderOrder = 16;
		this.group.add( this.points );
		this.scene.add( this.group );

		this.loadDemo( 'torusKnot' );
		this.applyPreset( 'modelReveal' );

	}

	getDemoList() {

		return DEMO_MODEL_DEFINITIONS.map( ( demo ) => ( { ...demo } ) );

	}

	getState() {

		return {
			activePreset: this.activePreset,
			activeDemoId: this.activeDemoId,
			sourceLabel: this.sourceLabel,
			sourceType: this.sourceType,
			hasModel: this.targetCount > 0,
			enabled: this.enabled,
			targetCount: this.targetCount,
			activeCount: this.activeCount,
			params: { ...this.params },
			demos: this.getDemoList()
		};

	}

	async loadFromFile( file ) {

		if ( ! file ) throw new Error( 'No file selected.' );
		const token = ++ this.loadToken;
		const buffer = await file.arrayBuffer();
		const gltf = await parseGLTFAsync( this.loader, buffer );
		if ( token !== this.loadToken ) return this.getState();

		const root = gltf?.scene || gltf?.scenes?.[ 0 ];
		if ( ! root ) throw new Error( 'Invalid GLB: scene not found.' );

		root.updateMatrixWorld( true );
		const meshes = this._collectSampleMeshes( root );
		if ( meshes.length === 0 ) throw new Error( 'Invalid GLB: mesh geometry not found.' );

		this._setSourceRoot( root, {
			sourceLabel: file.name || 'Uploaded model',
			sourceType: 'upload',
			disposable: true
		} );
		this.activeDemoId = null;
		this._rebuildTargetsFromSource();
		return this.getState();

	}

	async loadDemo( demoId ) {

		const safeId = DEMO_MODEL_DEFINITIONS.some( ( demo ) => demo.id === demoId ) ? demoId : 'torusKnot';
		const root = createDemoRoot( safeId );
		this._setSourceRoot( root, {
			sourceLabel: `Demo: ${ DEMO_MODEL_DEFINITIONS.find( ( demo ) => demo.id === safeId )?.name || safeId }`,
			sourceType: 'demo',
			disposable: true
		} );
		this.activeDemoId = safeId;
		this._rebuildTargetsFromSource();
		return this.getState();

	}

	applyPreset( presetKey ) {

		const config = MODEL_FX_PRESET_CONFIGS[ presetKey ] || MODEL_FX_PRESET_CONFIGS.modelReveal;
		this.activePreset = MODEL_FX_PRESET_CONFIGS[ presetKey ] ? presetKey : 'modelReveal';
		this.colorA = cloneMaterialColor( config.colorA );
		this.colorB = cloneMaterialColor( config.colorB );

		this.setParams( {
			pointCount: config.pointCount,
			attraction: config.attraction,
			noiseStrength: config.noiseStrength,
			noiseScale: config.noiseScale,
			noiseSpeed: config.noiseSpeed,
			orbitStrength: config.orbitStrength,
			damping: config.damping,
			pointSize: config.pointSize,
			jitter: config.jitter,
			pulseStrength: config.pulseStrength,
			pulseSpeed: config.pulseSpeed
		}, { rebuild: true } );

		this.enabled = true;
		this._injectBurst( config.burstImpulse || 0.8 );
		return true;

	}

	setParams( partial, options = {} ) {

		if ( ! partial || typeof partial !== 'object' ) return this.getState();

		let rebuildTargets = options.rebuild === true;
		const next = { ...this.params };

		for ( const [ key, rawValue ] of Object.entries( partial ) ) {

			if ( key === 'samplingMode' ) {

				const mode = String( rawValue || '' ).toLowerCase();
				const safeMode = mode === 'vertex' ? 'vertex' : 'surface';
				if ( next.samplingMode !== safeMode ) {

					next.samplingMode = safeMode;
					rebuildTargets = true;

				}
				continue;

			}

			if ( key === 'pointCount' ) {

				const safeCount = Math.round( clampNumber( rawValue, 1000, this.maxParticles, next.pointCount ) / 100 ) * 100;
				if ( safeCount !== next.pointCount ) {

					next.pointCount = safeCount;
					rebuildTargets = true;

				}
				continue;

			}

			if ( key === 'attraction' ) next.attraction = clampNumber( rawValue, 0.0, 12.0, next.attraction );
			if ( key === 'noiseStrength' ) next.noiseStrength = clampNumber( rawValue, 0.0, 4.0, next.noiseStrength );
			if ( key === 'noiseScale' ) next.noiseScale = clampNumber( rawValue, 0.1, 6.0, next.noiseScale );
			if ( key === 'noiseSpeed' ) next.noiseSpeed = clampNumber( rawValue, 0.0, 5.0, next.noiseSpeed );
			if ( key === 'orbitStrength' ) next.orbitStrength = clampNumber( rawValue, 0.0, 6.0, next.orbitStrength );
			if ( key === 'damping' ) next.damping = clampNumber( rawValue, 0.2, 8.0, next.damping );
			if ( key === 'pointSize' ) next.pointSize = clampNumber( rawValue, 0.01, 0.3, next.pointSize );
			if ( key === 'jitter' ) next.jitter = clampNumber( rawValue, 0.0, 2.0, next.jitter );
			if ( key === 'pulseStrength' ) next.pulseStrength = clampNumber( rawValue, 0.0, 0.9, next.pulseStrength );
			if ( key === 'pulseSpeed' ) next.pulseSpeed = clampNumber( rawValue, 0.1, 6.0, next.pulseSpeed );

		}

		this.params = next;
		this.material.size = this.params.pointSize;
		if ( rebuildTargets ) this._rebuildTargetsFromSource();
		return this.getState();

	}

	clear() {

		this.enabled = false;
		this.activeCount = 0;
		this.geometry.setDrawRange( 0, 0 );
		this.positionAttribute.needsUpdate = true;
		this.colorAttribute.needsUpdate = true;

	}

	clearModel() {

		this.clear();
		if ( this.sourceRoot && this.sourceDisposable ) disposeObjectResources( this.sourceRoot );
		this.sourceRoot = null;
		this.sourceDisposable = false;
		this.sourceLabel = 'No model loaded';
		this.sourceType = 'none';
		this.targetCount = 0;
		this.activeDemoId = null;
		return this.getState();

	}

	update( delta ) {

		if ( ! this.enabled || this.targetCount <= 0 ) return;
		const dt = Math.min( 0.05, Math.max( 0.0005, delta ) );
		this.time += dt;

		const requestedCount = clamp( Math.floor( this.params.pointCount ), 1000, this.targetCount );
		this.activeCount = requestedCount;
		this.geometry.setDrawRange( 0, this.activeCount );
		this.material.size = this.params.pointSize;

		const noiseScale = this.params.noiseScale;
		const noiseStrength = this.params.noiseStrength;
		const attraction = this.params.attraction;
		const orbitStrength = this.params.orbitStrength;
		const jitter = this.params.jitter;
		const pulseStrength = this.params.pulseStrength;
		const pulseSpeed = this.params.pulseSpeed;
		const dampingFactor = Math.exp( - this.params.damping * dt );

		const originX = this.modelOrigin.x;
		const originY = this.modelOrigin.y;
		const originZ = this.modelOrigin.z;

		for ( let i = 0; i < this.activeCount; i ++ ) {

			const i3 = i * 3;
			const phase = this.phases[ i ];
			const pulse = 1.0 + Math.sin( this.time * pulseSpeed + phase * 1.7 ) * pulseStrength;

			const baseTargetX = this.baseTargets[ i3 + 0 ];
			const baseTargetY = this.baseTargets[ i3 + 1 ];
			const baseTargetZ = this.baseTargets[ i3 + 2 ];

			const targetX = originX + ( baseTargetX - originX ) * pulse;
			const targetY = originY + ( baseTargetY - originY ) * pulse;
			const targetZ = originZ + ( baseTargetZ - originZ ) * pulse;

			let px = this.positions[ i3 + 0 ];
			let py = this.positions[ i3 + 1 ];
			let pz = this.positions[ i3 + 2 ];
			let vx = this.velocities[ i3 + 0 ];
			let vy = this.velocities[ i3 + 1 ];
			let vz = this.velocities[ i3 + 2 ];

			vx += ( targetX - px ) * attraction * dt;
			vy += ( targetY - py ) * attraction * dt;
			vz += ( targetZ - pz ) * attraction * dt;

			const nt = this.time * this.params.noiseSpeed + phase;
			const nx = Math.sin( nt + pz * noiseScale ) + Math.cos( nt * 0.73 + py * noiseScale * 1.3 );
			const ny = Math.cos( nt * 0.88 + px * noiseScale * 1.2 ) + Math.sin( nt * 1.21 + pz * noiseScale );
			const nz = Math.sin( nt * 1.14 + px * noiseScale * 0.9 ) + Math.cos( nt * 0.66 + py * noiseScale * 0.7 );

			vx += nx * noiseStrength * dt * 0.55;
			vy += ny * noiseStrength * dt * 0.45;
			vz += nz * noiseStrength * dt * 0.55;

			const rx = targetX - originX;
			const rz = targetZ - originZ;
			const radius = Math.max( 0.25, Math.hypot( rx, rz ) );
			vx += ( - rz / radius ) * orbitStrength * dt;
			vz += ( rx / radius ) * orbitStrength * dt;

			vx *= dampingFactor;
			vy *= dampingFactor;
			vz *= dampingFactor;

			px += vx * dt;
			py += vy * dt;
			pz += vz * dt;

			if ( jitter > 0 ) {

				px += Math.sin( nt * 2.3 + phase ) * jitter * dt * 0.12;
				py += Math.cos( nt * 2.1 + phase * 0.5 ) * jitter * dt * 0.1;
				pz += Math.sin( nt * 1.9 - phase * 0.7 ) * jitter * dt * 0.12;

			}

			this.positions[ i3 + 0 ] = px;
			this.positions[ i3 + 1 ] = py;
			this.positions[ i3 + 2 ] = pz;
			this.velocities[ i3 + 0 ] = vx;
			this.velocities[ i3 + 1 ] = vy;
			this.velocities[ i3 + 2 ] = vz;

			const yMix = clamp( ( baseTargetY - ( originY - this.fitSize * 0.5 ) ) / this.fitSize, 0, 1 );
			const baseR = this.colorA.r + ( this.colorB.r - this.colorA.r ) * yMix;
			const baseG = this.colorA.g + ( this.colorB.g - this.colorA.g ) * yMix;
			const baseB = this.colorA.b + ( this.colorB.b - this.colorA.b ) * yMix;
			const speed = Math.hypot( vx, vy, vz );
			const glow = clamp( 0.5 + speed * 0.08, 0.45, 1.35 );

			this.colors[ i3 + 0 ] = clamp( baseR * glow, 0, 1 );
			this.colors[ i3 + 1 ] = clamp( baseG * glow, 0, 1 );
			this.colors[ i3 + 2 ] = clamp( baseB * glow, 0, 1 );

		}

		this.positionAttribute.needsUpdate = true;
		this.colorAttribute.needsUpdate = true;

	}

	dispose() {

		this.clearModel();
		if ( this.group.parent ) this.group.parent.remove( this.group );
		if ( this.geometry ) this.geometry.dispose();
		if ( this.material ) this.material.dispose();

	}

	_setSourceRoot( root, options ) {

		if ( this.sourceRoot && this.sourceDisposable ) disposeObjectResources( this.sourceRoot );
		this.sourceRoot = root;
		this.sourceDisposable = options.disposable === true;
		this.sourceLabel = options.sourceLabel || 'Model';
		this.sourceType = options.sourceType || 'unknown';
		this.enabled = true;

	}

	_collectSampleMeshes( root ) {

		const meshes = [];
		root.updateMatrixWorld( true );

		root.traverse( ( node ) => {

			if ( ! node.isMesh || ! node.geometry ) return;
			const positionAttribute = node.geometry.getAttribute( 'position' );
			if ( ! positionAttribute || positionAttribute.count < 3 ) return;
			meshes.push( {
				mesh: node,
				weight: getTriangleWeight( node.geometry )
			} );

		} );

		return meshes;

	}

	_sampleSurfacePoints( meshes, pointCount ) {

		const points = [];
		if ( meshes.length === 0 || pointCount <= 0 ) return points;

		const totalWeight = meshes.reduce( ( sum, entry ) => sum + entry.weight, 0 ) || meshes.length;
		const temp = new THREE.Vector3();
		let generated = 0;

		for ( let i = 0; i < meshes.length; i ++ ) {

			const entry = meshes[ i ];
			let count = Math.floor( pointCount * ( entry.weight / totalWeight ) );
			if ( i === meshes.length - 1 ) count = Math.max( 0, pointCount - generated );
			if ( count <= 0 ) continue;

			const sampler = new MeshSurfaceSampler( entry.mesh ).build();
			for ( let j = 0; j < count; j ++ ) {

				sampler.sample( temp );
				temp.applyMatrix4( entry.mesh.matrixWorld );
				points.push( temp.clone() );

			}

			generated += count;

		}

		while ( points.length < pointCount ) {

			const fallbackMesh = meshes[ Math.floor( Math.random() * meshes.length ) ];
			const sampler = new MeshSurfaceSampler( fallbackMesh.mesh ).build();
			sampler.sample( temp );
			temp.applyMatrix4( fallbackMesh.mesh.matrixWorld );
			points.push( temp.clone() );

		}

		return points;

	}

	_sampleVertexPoints( meshes, pointCount ) {

		const vertices = [];
		const transformed = new THREE.Vector3();

		for ( let i = 0; i < meshes.length; i ++ ) {

			const mesh = meshes[ i ].mesh;
			const position = mesh.geometry.getAttribute( 'position' );
			for ( let j = 0; j < position.count; j ++ ) {

				transformed.fromBufferAttribute( position, j );
				transformed.applyMatrix4( mesh.matrixWorld );
				vertices.push( transformed.clone() );

			}

		}

		if ( vertices.length === 0 ) return [];
		if ( vertices.length === pointCount ) return vertices;

		if ( vertices.length > pointCount ) {

			const sampled = [];
			const step = vertices.length / pointCount;
			for ( let i = 0; i < pointCount; i ++ ) {

				const index = Math.min( vertices.length - 1, Math.floor( i * step + Math.random() * step * 0.45 ) );
				sampled.push( vertices[ index ].clone() );

			}
			return sampled;

		}

		const expanded = vertices.map( ( v ) => v.clone() );
		while ( expanded.length < pointCount ) {

			const source = vertices[ Math.floor( Math.random() * vertices.length ) ];
			expanded.push( source.clone().add( new THREE.Vector3(
				( Math.random() - 0.5 ) * 0.01,
				( Math.random() - 0.5 ) * 0.01,
				( Math.random() - 0.5 ) * 0.01
			) ) );

		}

		return expanded;

	}

	_rebuildTargetsFromSource() {

		if ( ! this.sourceRoot ) {

			this.targetCount = 0;
			this.activeCount = 0;
			this.geometry.setDrawRange( 0, 0 );
			return;

		}

		const meshes = this._collectSampleMeshes( this.sourceRoot );
		if ( meshes.length === 0 ) {

			this.targetCount = 0;
			this.activeCount = 0;
			this.geometry.setDrawRange( 0, 0 );
			return;

		}

		const targetCount = clamp( Math.floor( this.params.pointCount ), 1000, this.maxParticles );
		const rawPoints = this.params.samplingMode === 'vertex'
			? this._sampleVertexPoints( meshes, targetCount )
			: this._sampleSurfacePoints( meshes, targetCount );

		if ( rawPoints.length === 0 ) {

			this.targetCount = 0;
			this.activeCount = 0;
			this.geometry.setDrawRange( 0, 0 );
			return;

		}

		const bounds = new THREE.Box3();
		for ( let i = 0; i < rawPoints.length; i ++ ) bounds.expandByPoint( rawPoints[ i ] );
		const center = bounds.getCenter( new THREE.Vector3() );
		const size = bounds.getSize( new THREE.Vector3() );
		const maxDim = Math.max( size.x, size.y, size.z, 1e-4 );
		const scale = this.fitSize / maxDim;

		const spread = this.fitSize * 0.42;
		this.targetCount = Math.min( rawPoints.length, this.maxParticles );
		this.activeCount = this.targetCount;

		for ( let i = 0; i < this.targetCount; i ++ ) {

			const point = rawPoints[ i ];
			const i3 = i * 3;
			const tx = ( point.x - center.x ) * scale + this.modelOrigin.x;
			const ty = ( point.y - center.y ) * scale + this.modelOrigin.y;
			const tz = ( point.z - center.z ) * scale + this.modelOrigin.z;

			this.baseTargets[ i3 + 0 ] = tx;
			this.baseTargets[ i3 + 1 ] = ty;
			this.baseTargets[ i3 + 2 ] = tz;

			this.positions[ i3 + 0 ] = tx + ( Math.random() - 0.5 ) * spread;
			this.positions[ i3 + 1 ] = ty + ( Math.random() - 0.5 ) * spread;
			this.positions[ i3 + 2 ] = tz + ( Math.random() - 0.5 ) * spread;

			this.velocities[ i3 + 0 ] = ( Math.random() - 0.5 ) * 0.2;
			this.velocities[ i3 + 1 ] = ( Math.random() - 0.5 ) * 0.2;
			this.velocities[ i3 + 2 ] = ( Math.random() - 0.5 ) * 0.2;

			this.phases[ i ] = Math.random() * Math.PI * 2;

			this.colors[ i3 + 0 ] = this.colorA.r;
			this.colors[ i3 + 1 ] = this.colorA.g;
			this.colors[ i3 + 2 ] = this.colorA.b;

		}

		for ( let i = this.targetCount; i < this.maxParticles; i ++ ) {

			const i3 = i * 3;
			this.positions[ i3 + 0 ] = this.modelOrigin.x;
			this.positions[ i3 + 1 ] = this.modelOrigin.y;
			this.positions[ i3 + 2 ] = this.modelOrigin.z;
			this.velocities[ i3 + 0 ] = 0;
			this.velocities[ i3 + 1 ] = 0;
			this.velocities[ i3 + 2 ] = 0;
			this.baseTargets[ i3 + 0 ] = this.modelOrigin.x;
			this.baseTargets[ i3 + 1 ] = this.modelOrigin.y;
			this.baseTargets[ i3 + 2 ] = this.modelOrigin.z;
			this.colors[ i3 + 0 ] = 0;
			this.colors[ i3 + 1 ] = 0;
			this.colors[ i3 + 2 ] = 0;
			this.phases[ i ] = 0;

		}

		this.geometry.setDrawRange( 0, this.activeCount );
		this.positionAttribute.needsUpdate = true;
		this.colorAttribute.needsUpdate = true;

	}

	_injectBurst( amount ) {

		const safeAmount = clampNumber( amount, 0, 8.0, 0.8 );
		for ( let i = 0; i < this.targetCount; i ++ ) {

			const i3 = i * 3;
			const tx = this.baseTargets[ i3 + 0 ] - this.modelOrigin.x;
			const ty = this.baseTargets[ i3 + 1 ] - this.modelOrigin.y;
			const tz = this.baseTargets[ i3 + 2 ] - this.modelOrigin.z;
			const len = Math.max( 0.001, Math.hypot( tx, ty, tz ) );
			const invLen = 1 / len;
			this.velocities[ i3 + 0 ] += tx * invLen * safeAmount;
			this.velocities[ i3 + 1 ] += ty * invLen * safeAmount;
			this.velocities[ i3 + 2 ] += tz * invLen * safeAmount;

		}

	}

}
