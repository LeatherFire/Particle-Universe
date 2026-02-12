import { PRESET_CATEGORIES, PRESET_META, PRESETS } from '../js/presets/PresetLibrary.js';

function max( values ) {

	if ( values.length === 0 ) return 0;
	return values.reduce( ( a, b ) => ( a > b ? a : b ), values[ 0 ] );

}

function mean( values ) {

	if ( values.length === 0 ) return 0;
	return values.reduce( ( a, b ) => a + b, 0 ) / values.length;

}

const coreKeys = PRESET_CATEGORIES.core;
const vfxKeys = PRESET_CATEGORIES.vfxLab;
const modelFxKeys = PRESET_CATEGORIES.modelFx || [];
const shaderBuilderKeys = PRESET_CATEGORIES.shaderBuilder || [];
const allKeys = [ ...coreKeys, ...vfxKeys, ...modelFxKeys, ...shaderBuilderKeys ];
const allBaseCounts = allKeys.map( key => PRESETS[ key ].params.particleCount );
const webglOverrideCounts = vfxKeys
	.map( key => PRESET_META[ key ]?.webglOverrides?.particleCount )
	.filter( value => Number.isFinite( value ) );

const markdown = [
	'# ParticleUniverse Release Report',
	'',
	`Generated at: ${ new Date().toISOString() }`,
	'',
	'## Preset Inventory',
	`- Total presets: ${ allKeys.length }`,
	`- Core presets: ${ coreKeys.length }`,
	`- VFX Lab presets: ${ vfxKeys.length }`,
	`- Model FX presets: ${ modelFxKeys.length }`,
	`- Shader Builder presets: ${ shaderBuilderKeys.length }`,
	'',
	'## Particle Count Summary (Base Presets)',
	`- Max: ${ max( allBaseCounts ).toLocaleString() }`,
	`- Avg: ${ Math.round( mean( allBaseCounts ) ).toLocaleString() }`,
	'',
	'## WebGL Override Summary (VFX Lab)',
	`- Max override particleCount: ${ max( webglOverrideCounts ).toLocaleString() }`,
	`- Avg override particleCount: ${ Math.round( mean( webglOverrideCounts ) ).toLocaleString() }`,
	'',
	'## VFX Lab Override Table',
	'| Preset | WebGL particleCount |',
	'|---|---:|',
	...vfxKeys.map( ( key ) => `| ${ PRESETS[ key ].name } | ${ ( PRESET_META[ key ]?.webglOverrides?.particleCount ?? 0 ).toLocaleString() } |` ),
	'',
	'## Model FX Override Table',
	'| Preset | WebGL particleCount |',
	'|---|---:|',
	...modelFxKeys.map( ( key ) => `| ${ PRESETS[ key ].name } | ${ ( PRESET_META[ key ]?.webglOverrides?.particleCount ?? 0 ).toLocaleString() } |` ),
	'',
	'## Shader Builder Table',
	'| Preset | Template | WebGL particleCount |',
	'|---|---|---:|',
	...shaderBuilderKeys.map(
		( key ) => `| ${ PRESETS[ key ].name } | ${ PRESET_META[ key ]?.shaderTemplateId ?? '-' } | ${ ( PRESET_META[ key ]?.webglOverrides?.particleCount ?? 0 ).toLocaleString() } |`
	),
	''
];

console.log( markdown.join( '\n' ) );
