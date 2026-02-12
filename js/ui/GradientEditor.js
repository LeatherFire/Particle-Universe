export class GradientEditor {

	constructor( container, options = {} ) {

		this.onChange = options.onChange || ( () => {} );
		this.width = options.width || 296;
		this.height = options.height || 50;

		// Color stops: [{pos: 0-1, color: '#hex'}]
		this.stops = options.defaultStops || [
			{ pos: 0.0, color: '#ffffff' },
			{ pos: 0.5, color: '#ff6600' },
			{ pos: 1.0, color: '#000000' }
		];

		this.draggingIndex = - 1;
		this.selectedIndex = - 1;

		this._createElements( container );
		this._bindEvents();
		this.draw();

	}

	_createElements( container ) {

		this.wrapper = document.createElement( 'div' );
		this.wrapper.style.position = 'relative';
		this.wrapper.style.marginBottom = '8px';

		// Gradient canvas
		this.canvas = document.createElement( 'canvas' );
		this.canvas.className = 'gradient-canvas';
		this.canvas.width = this.width * 2;
		this.canvas.height = this.height * 2;
		this.canvas.style.width = '100%';
		this.canvas.style.height = this.height + 'px';
		this.ctx = this.canvas.getContext( '2d' );
		this.wrapper.appendChild( this.canvas );

		// Hidden color input for picking
		this.colorInput = document.createElement( 'input' );
		this.colorInput.type = 'color';
		this.colorInput.style.position = 'absolute';
		this.colorInput.style.opacity = '0';
		this.colorInput.style.pointerEvents = 'none';
		this.colorInput.style.width = '0';
		this.colorInput.style.height = '0';
		this.wrapper.appendChild( this.colorInput );

		this.colorInput.addEventListener( 'input', ( e ) => {

			if ( this.selectedIndex >= 0 && this.selectedIndex < this.stops.length ) {

				this.stops[ this.selectedIndex ].color = e.target.value;
				this.draw();
				this._emitChange();

			}

		} );

		container.appendChild( this.wrapper );

	}

	_bindEvents() {

		const rect = () => this.canvas.getBoundingClientRect();

		this.canvas.addEventListener( 'mousedown', ( e ) => {

			const r = rect();
			const mx = ( e.clientX - r.left ) / r.width;
			const my = ( e.clientY - r.top ) / r.height;

			// Check stop handles (bottom area)
			const hitIndex = this._findStopAt( mx );

			if ( hitIndex >= 0 ) {

				this.draggingIndex = hitIndex;
				this.selectedIndex = hitIndex;
				this.canvas.style.cursor = 'grabbing';

			} else if ( my < 0.7 ) {

				// Click on gradient bar to add new stop
				const newColor = this._sampleGradientAt( mx );
				const newStop = { pos: mx, color: newColor };
				this.stops.push( newStop );
				this.stops.sort( ( a, b ) => a.pos - b.pos );
				this.selectedIndex = this.stops.indexOf( newStop );
				this.draggingIndex = this.selectedIndex;
				this.draw();
				this._emitChange();

			}

		} );

		this.canvas.addEventListener( 'mousemove', ( e ) => {

			const r = rect();
			const mx = ( e.clientX - r.left ) / r.width;

			if ( this.draggingIndex >= 0 ) {

				const stop = this.stops[ this.draggingIndex ];

				// First and last stops constrained
				if ( this.draggingIndex === 0 ) {

					stop.pos = 0;

				} else if ( this.draggingIndex === this.stops.length - 1 ) {

					stop.pos = 1;

				} else {

					stop.pos = Math.max( 0.01, Math.min( 0.99, mx ) );

				}

				this.stops.sort( ( a, b ) => a.pos - b.pos );
				this.draggingIndex = this.stops.indexOf( stop );
				this.selectedIndex = this.draggingIndex;
				this.draw();
				this._emitChange();

			} else {

				const hoverIdx = this._findStopAt( mx );
				this.canvas.style.cursor = hoverIdx >= 0 ? 'grab' : 'crosshair';

			}

		} );

		window.addEventListener( 'mouseup', () => {

			if ( this.draggingIndex >= 0 ) {

				this.draggingIndex = - 1;
				this.canvas.style.cursor = 'crosshair';

			}

		} );

		// Double-click to pick color
		this.canvas.addEventListener( 'dblclick', ( e ) => {

			const r = rect();
			const mx = ( e.clientX - r.left ) / r.width;
			const hitIndex = this._findStopAt( mx );

			if ( hitIndex >= 0 ) {

				this.selectedIndex = hitIndex;
				this.colorInput.value = this.stops[ hitIndex ].color;
				this.colorInput.click();

			}

		} );

		// Right-click to delete
		this.canvas.addEventListener( 'contextmenu', ( e ) => {

			e.preventDefault();
			const r = rect();
			const mx = ( e.clientX - r.left ) / r.width;
			const hitIndex = this._findStopAt( mx );

			if ( hitIndex > 0 && hitIndex < this.stops.length - 1 && this.stops.length > 2 ) {

				this.stops.splice( hitIndex, 1 );
				this.selectedIndex = - 1;
				this.draw();
				this._emitChange();

			}

		} );

	}

	_findStopAt( mx ) {

		const threshold = 0.03;
		for ( let i = 0; i < this.stops.length; i ++ ) {

			if ( Math.abs( this.stops[ i ].pos - mx ) < threshold ) return i;

		}

		return - 1;

	}

	_sampleGradientAt( t ) {

		const sorted = [ ...this.stops ].sort( ( a, b ) => a.pos - b.pos );
		if ( t <= sorted[ 0 ].pos ) return sorted[ 0 ].color;
		if ( t >= sorted[ sorted.length - 1 ].pos ) return sorted[ sorted.length - 1 ].color;

		for ( let i = 0; i < sorted.length - 1; i ++ ) {

			if ( t >= sorted[ i ].pos && t <= sorted[ i + 1 ].pos ) {

				const localT = ( t - sorted[ i ].pos ) / ( sorted[ i + 1 ].pos - sorted[ i ].pos );
				return this._lerpColor( sorted[ i ].color, sorted[ i + 1 ].color, localT );

			}

		}

		return '#ffffff';

	}

	_lerpColor( c1, c2, t ) {

		const r1 = parseInt( c1.slice( 1, 3 ), 16 );
		const g1 = parseInt( c1.slice( 3, 5 ), 16 );
		const b1 = parseInt( c1.slice( 5, 7 ), 16 );
		const r2 = parseInt( c2.slice( 1, 3 ), 16 );
		const g2 = parseInt( c2.slice( 3, 5 ), 16 );
		const b2 = parseInt( c2.slice( 5, 7 ), 16 );

		const r = Math.round( r1 + ( r2 - r1 ) * t );
		const g = Math.round( g1 + ( g2 - g1 ) * t );
		const b = Math.round( b1 + ( b2 - b1 ) * t );

		return '#' + ( ( 1 << 24 ) + ( r << 16 ) + ( g << 8 ) + b ).toString( 16 ).slice( 1 );

	}

	_emitChange() {

		this.onChange( this.getStops() );

	}

	getStops() {

		return [ ...this.stops ].sort( ( a, b ) => a.pos - b.pos );

	}

	setStops( stops ) {

		this.stops = stops.map( s => ( { pos: s.pos, color: s.color } ) );
		this.stops.sort( ( a, b ) => a.pos - b.pos );
		this.selectedIndex = - 1;
		this.draw();

	}

	draw() {

		const ctx = this.ctx;
		const w = this.canvas.width;
		const h = this.canvas.height;
		const barHeight = h * 0.65;
		const handleY = barHeight + 8;
		const pad = 4;

		ctx.clearRect( 0, 0, w, h );

		// Checkerboard background (for transparency)
		const checkSize = 10;
		for ( let y = 0; y < barHeight; y += checkSize ) {

			for ( let x = pad; x < w - pad; x += checkSize ) {

				ctx.fillStyle = ( ( x / checkSize + y / checkSize ) % 2 < 1 ) ? '#2a2a3a' : '#1a1a2a';
				ctx.fillRect( x, y, checkSize, checkSize );

			}

		}

		// Gradient bar
		const sorted = [ ...this.stops ].sort( ( a, b ) => a.pos - b.pos );
		const gradient = ctx.createLinearGradient( pad, 0, w - pad, 0 );

		for ( const stop of sorted ) {

			gradient.addColorStop( Math.max( 0, Math.min( 1, stop.pos ) ), stop.color );

		}

		ctx.fillStyle = gradient;
		ctx.beginPath();
		ctx.roundRect( pad, 0, w - pad * 2, barHeight, 8 );
		ctx.fill();

		// Border
		ctx.strokeStyle = 'rgba(255,255,255,0.1)';
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.roundRect( pad, 0, w - pad * 2, barHeight, 8 );
		ctx.stroke();

		// Stop handles
		for ( let i = 0; i < this.stops.length; i ++ ) {

			const stop = this.stops[ i ];
			const x = pad + stop.pos * ( w - pad * 2 );
			const isSelected = i === this.selectedIndex;
			const isDragging = i === this.draggingIndex;

			// Triangle pointer
			ctx.beginPath();
			ctx.moveTo( x, barHeight - 2 );
			ctx.lineTo( x - 10, handleY + 12 );
			ctx.lineTo( x + 10, handleY + 12 );
			ctx.closePath();
			ctx.fillStyle = stop.color;
			ctx.fill();
			ctx.strokeStyle = isSelected || isDragging ? '#ffffff' : 'rgba(255,255,255,0.4)';
			ctx.lineWidth = isSelected ? 3 : 2;
			ctx.stroke();

			// Inner color circle
			ctx.beginPath();
			ctx.arc( x, handleY + 18, 8, 0, Math.PI * 2 );
			ctx.fillStyle = stop.color;
			ctx.fill();
			ctx.strokeStyle = isSelected ? '#ffffff' : 'rgba(255,255,255,0.3)';
			ctx.lineWidth = 2;
			ctx.stroke();

		}

	}

}
