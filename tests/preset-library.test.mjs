import test from 'node:test';
import assert from 'node:assert/strict';

import {
	PRESETS,
	PRESET_ORDER,
	PRESET_CATEGORIES,
	PRESET_META,
	getPreset,
	getPresetCategory,
	getPresetKeysByCategory
} from '../js/presets/PresetLibrary.js';

const REQUIRED_PARAM_KEYS = [
	'particleCount',
	'emitterShape',
	'lifetimeMin',
	'lifetimeMax',
	'initialSpeedMin',
	'initialSpeedMax',
	'initialSpread',
	'startSize',
	'gravityStrength',
	'turbulenceStrength',
	'vortexStrength',
	'colorGradient',
	'sizeCurve',
	'opacityCurve',
	'particleShape'
];

test( 'preset order references valid preset keys', () => {

	assert.ok( PRESET_ORDER.length > 0, 'PRESET_ORDER should not be empty' );

	const seen = new Set();

	for ( const key of PRESET_ORDER ) {

		assert.ok( PRESETS[ key ], `Missing PRESETS entry for "${ key }"` );
		assert.ok( ! seen.has( key ), `Duplicate key in PRESET_ORDER: "${ key }"` );
		seen.add( key );

	}

	assert.equal(
		Object.keys( PRESETS ).length,
		seen.size,
		'Every preset should appear exactly once in PRESET_ORDER'
	);

} );

test( 'each preset has required structure for runtime apply', () => {

	for ( const [ key, preset ] of Object.entries( PRESETS ) ) {

		assert.equal( typeof preset.name, 'string', `${ key } missing name` );
		assert.equal( typeof preset.icon, 'string', `${ key } missing icon` );
		assert.ok( preset.params && typeof preset.params === 'object', `${ key } missing params` );

		for ( const requiredKey of REQUIRED_PARAM_KEYS ) {

			assert.ok(
				requiredKey in preset.params,
				`${ key } is missing required param "${ requiredKey }"`
			);

		}

		assert.ok( Array.isArray( preset.params.colorGradient ), `${ key } gradient must be an array` );
		assert.ok( preset.params.colorGradient.length >= 2, `${ key } gradient should have at least 2 points` );

		for ( const point of preset.params.colorGradient ) {

			assert.equal( typeof point.pos, 'number', `${ key } gradient point missing numeric pos` );
			assert.ok( point.pos >= 0 && point.pos <= 1, `${ key } gradient pos out of [0,1] range` );
			assert.equal( typeof point.color, 'string', `${ key } gradient point missing color string` );

		}

	}

} );

test( 'categories and metadata are consistent', () => {

	const categoryKeys = Object.keys( PRESET_CATEGORIES );
	assert.deepEqual(
		categoryKeys.sort(),
		[ 'core', 'modelFx', 'shaderBuilder', 'vfxLab' ],
		'Expected categories: core, vfxLab, modelFx, shaderBuilder'
	);

	const allCategoryKeys = new Set();

	for ( const [ category, keys ] of Object.entries( PRESET_CATEGORIES ) ) {

		assert.ok( Array.isArray( keys ) && keys.length > 0, `${ category } category should have keys` );

		for ( const key of keys ) {

			assert.ok( PRESETS[ key ], `Category key "${ key }" does not exist in PRESETS` );
			assert.ok( ! allCategoryKeys.has( key ), `Preset "${ key }" appears in multiple categories` );
			allCategoryKeys.add( key );

			assert.ok( PRESET_META[ key ], `Missing PRESET_META entry for "${ key }"` );
			assert.equal(
				PRESET_META[ key ].category,
				category,
				`PRESET_META category mismatch for "${ key }"`
			);
			assert.equal(
				typeof PRESET_META[ key ].backendProfile,
				'string',
				`Missing backendProfile for "${ key }"`
			);

		}

	}

	assert.equal( allCategoryKeys.size, PRESET_ORDER.length, 'Category coverage must match PRESET_ORDER size' );
	assert.equal( PRESET_CATEGORIES.vfxLab.length, 6, 'VFX Lab should contain 6 presets' );
	assert.equal( PRESET_CATEGORIES.modelFx.length, 4, 'Model FX should contain 4 presets' );
	assert.equal( PRESET_CATEGORIES.shaderBuilder.length, 8, 'Shader Builder should contain 8 presets' );

} );

test( 'vfxLab webgl overrides stay within compatibility cap', () => {

	for ( const key of PRESET_CATEGORIES.vfxLab ) {

		const meta = PRESET_META[ key ];
		assert.ok( meta.webglOverrides, `${ key } should define webglOverrides` );
		assert.ok(
			meta.webglOverrides.particleCount <= 35000,
			`${ key } webglOverrides.particleCount should be <= 35000`
		);

	}

} );

test( 'modelFx metadata and defaults are defined', () => {

	for ( const key of PRESET_CATEGORIES.modelFx ) {

		const meta = PRESET_META[ key ];
		assert.ok( meta, `${ key } should exist in PRESET_META` );
		assert.equal( meta.category, 'modelFx', `${ key } should be in modelFx category` );
		assert.equal( meta.backendProfile, 'webglFirst', `${ key } should use webglFirst profile` );
		assert.ok( meta.webglOverrides, `${ key } should define webglOverrides` );
		assert.ok( meta.modelFxDefaults, `${ key } should define modelFxDefaults` );

		assert.ok(
			meta.webglOverrides.particleCount <= 35000,
			`${ key } webglOverrides.particleCount should be <= 35000`
		);

		assert.equal( meta.modelFxDefaults.samplingMode, 'surface', `${ key } samplingMode should default to surface` );
		assert.ok(
			meta.modelFxDefaults.pointCount >= 1000 && meta.modelFxDefaults.pointCount <= 35000,
			`${ key } modelFxDefaults.pointCount out of expected range`
		);

	}

} );

test( 'preset helper functions return safe fallbacks', () => {

	assert.equal( getPreset( 'fire' ), PRESETS.fire );
	assert.equal( getPreset( 'missing-key' ), PRESETS.fire );

	assert.equal( getPresetCategory( 'fire' ), 'core' );
	assert.equal( getPresetCategory( 'missing-key' ), 'core' );

	assert.deepEqual( getPresetKeysByCategory( 'vfxLab' ), PRESET_CATEGORIES.vfxLab );
	assert.deepEqual( getPresetKeysByCategory( 'modelFx' ), PRESET_CATEGORIES.modelFx );
	assert.deepEqual( getPresetKeysByCategory( 'shaderBuilder' ), PRESET_CATEGORIES.shaderBuilder );
	assert.deepEqual( getPresetKeysByCategory( 'unknown' ), PRESET_CATEGORIES.core );

} );

test( 'shaderBuilder metadata and defaults are defined', () => {

	for ( const key of PRESET_CATEGORIES.shaderBuilder ) {

		const meta = PRESET_META[ key ];
		assert.ok( meta, `${ key } should exist in PRESET_META` );
		assert.equal( meta.category, 'shaderBuilder', `${ key } should be in shaderBuilder category` );
		assert.equal( meta.backendProfile, 'webglFirst', `${ key } should use webglFirst profile` );
		assert.equal( typeof meta.shaderTemplateId, 'string', `${ key } should define shaderTemplateId` );
		assert.ok( meta.shaderBuilderDefaults, `${ key } should define shaderBuilderDefaults` );
		assert.ok( meta.postFxDefaults, `${ key } should define postFxDefaults` );
		assert.ok(
			meta.webglOverrides?.particleCount <= 35000,
			`${ key } webglOverrides.particleCount should be <= 35000`
		);
		assert.ok(
			meta.shaderBuilderDefaults.overlayOpacity >= 0 && meta.shaderBuilderDefaults.overlayOpacity <= 1,
			`${ key } overlayOpacity should be in [0,1]`
		);
		assert.ok(
			meta.shaderBuilderDefaults.overlayIntensity >= 0 && meta.shaderBuilderDefaults.overlayIntensity <= 3,
			`${ key } overlayIntensity should be in [0,3]`
		);
		assert.ok(
			meta.postFxDefaults.bloomAmount >= 0 && meta.postFxDefaults.bloomAmount <= 2.5,
			`${ key } bloomAmount should be in [0,2.5]`
		);
		assert.ok(
			meta.postFxDefaults.blurAmount >= 0 && meta.postFxDefaults.blurAmount <= 1,
			`${ key } blurAmount should be in [0,1]`
		);
		assert.ok(
			meta.postFxDefaults.feedbackAmount >= 0 && meta.postFxDefaults.feedbackAmount <= 1,
			`${ key } feedbackAmount should be in [0,1]`
		);

	}

} );
