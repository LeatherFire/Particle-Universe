import { PRESET_CATEGORIES } from '../js/presets/PresetLibrary.js';

const baseUrl = process.env.BASE_URL || 'http://localhost:5173';

function printGroup( title, urls ) {

	console.log( `\n${ title }` );
	for ( const url of urls ) console.log( `- ${ url }` );

}

printGroup( 'Core Launch URLs', [
	`${ baseUrl }`,
	`${ baseUrl }/?backend=webgl`,
	`${ baseUrl }/?backend=auto`,
	`${ baseUrl }/?backend=webgpu`
] );

printGroup( 'Demo URLs', [
	`${ baseUrl }/?demo=1&demoSet=core`,
	`${ baseUrl }/?demo=1&demoSet=vfxLab`,
	`${ baseUrl }/?demo=1&demoSet=modelFx`,
	`${ baseUrl }/?demo=1&demoSet=shaderBuilder`,
	`${ baseUrl }/?demo=1&demoSet=all&demoIntervalMs=6000`
] );

printGroup( 'Benchmark URLs', [
	`${ baseUrl }/?bench=1&benchSet=core&benchDurationMs=5000`,
	`${ baseUrl }/?bench=1&benchSet=vfxLab&benchDurationMs=7000`,
	`${ baseUrl }/?bench=1&benchSet=modelFx&benchDurationMs=7000`,
	`${ baseUrl }/?bench=1&benchSet=shaderBuilder&benchDurationMs=7000`,
	`${ baseUrl }/?bench=1&benchSet=all&benchDurationMs=6000&benchWarmupMs=800`
] );

console.log( '\nPreset Counts' );
console.log( `- Core: ${ PRESET_CATEGORIES.core.length }` );
console.log( `- VFX Lab: ${ PRESET_CATEGORIES.vfxLab.length }` );
console.log( `- Model FX: ${ PRESET_CATEGORIES.modelFx.length }` );
console.log( `- Shader Builder: ${ PRESET_CATEGORIES.shaderBuilder.length }` );
