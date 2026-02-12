export class CurveEditor {

	constructor( container, options = {} ) {

		this.label = options.label || 'Curve';
		this.onChange = options.onChange || ( () => {} );
		this.width = options.width || 296;
		this.height = options.height || 100;
		this.samples = options.samples || 32;
		this.color = options.color || '#7c6cf0';

		// Control points [{x: 0-1, y: 0-1}]
		this.points = options.defaultPoints || [
			{ x: 0, y: 0 },
			{ x: 0.2, y: 0.8 },
			{ x: 0.5, y: 1.0 },
			{ x: 0.8, y: 0.6 },
			{ x: 1.0, y: 0 }
		];

		this.draggingIndex = - 1;
		this.hoverIndex = - 1;

		this._createCanvas( container );
		this._bindEvents();
		this.draw();

	}

	_createCanvas( container ) {

		this.canvas = document.createElement( 'canvas' );
		this.canvas.className = 'curve-canvas';
		this.canvas.width = this.width * 2; // retina
		this.canvas.height = this.height * 2;
		this.canvas.style.width = '100%';
		this.canvas.style.height = this.height + 'px';
		this.ctx = this.canvas.getContext( '2d' );
		container.appendChild( this.canvas );

	}

	_bindEvents() {

		const rect = () => this.canvas.getBoundingClientRect();

		this.canvas.addEventListener( 'mousedown', ( e ) => {

			const r = rect();
			const mx = ( e.clientX - r.left ) / r.width;
			const my = 1 - ( e.clientY - r.top ) / r.height;

			// Check if clicking near existing point
			const hitIndex = this._findPointAt( mx, my );

			if ( hitIndex >= 0 ) {

				this.draggingIndex = hitIndex;

			} else {

				// Add new point
				const newPoint = { x: mx, y: Math.max( 0, Math.min( 1, my ) ) };
				this.points.push( newPoint );
				this.points.sort( ( a, b ) => a.x - b.x );
				this.draggingIndex = this.points.indexOf( newPoint );
				this.draw();
				this._emitChange();

			}

		} );

		this.canvas.addEventListener( 'mousemove', ( e ) => {

			const r = rect();
			const mx = ( e.clientX - r.left ) / r.width;
			const my = 1 - ( e.clientY - r.top ) / r.height;

			if ( this.draggingIndex >= 0 ) {

				const p = this.points[ this.draggingIndex ];

				// First and last points locked on x-axis
				if ( this.draggingIndex === 0 ) {

					p.x = 0;

				} else if ( this.draggingIndex === this.points.length - 1 ) {

					p.x = 1;

				} else {

					p.x = Math.max( 0.01, Math.min( 0.99, mx ) );

				}

				p.y = Math.max( 0, Math.min( 1, my ) );

				// Keep sorted
				this.points.sort( ( a, b ) => a.x - b.x );
				this.draggingIndex = this.points.indexOf( p );

				this.draw();
				this._emitChange();

			} else {

				// Hover detection
				const newHover = this._findPointAt( mx, my );
				if ( newHover !== this.hoverIndex ) {

					this.hoverIndex = newHover;
					this.canvas.style.cursor = newHover >= 0 ? 'grab' : 'crosshair';
					this.draw();

				}

			}

		} );

		window.addEventListener( 'mouseup', () => {

			if ( this.draggingIndex >= 0 ) {

				this.draggingIndex = - 1;
				this.canvas.style.cursor = 'crosshair';

			}

		} );

		// Right-click to delete point
		this.canvas.addEventListener( 'contextmenu', ( e ) => {

			e.preventDefault();
			const r = rect();
			const mx = ( e.clientX - r.left ) / r.width;
			const my = 1 - ( e.clientY - r.top ) / r.height;

			const hitIndex = this._findPointAt( mx, my );
			if ( hitIndex > 0 && hitIndex < this.points.length - 1 ) {

				this.points.splice( hitIndex, 1 );
				this.draw();
				this._emitChange();

			}

		} );

	}

	_findPointAt( mx, my ) {

		const threshold = 0.04;
		for ( let i = 0; i < this.points.length; i ++ ) {

			const dx = this.points[ i ].x - mx;
			const dy = this.points[ i ].y - my;
			if ( Math.sqrt( dx * dx + dy * dy ) < threshold ) return i;

		}

		return - 1;

	}

	_emitChange() {

		this.onChange( this.getSampledValues() );

	}

	getSampledValues( count ) {

		count = count || this.samples;
		const values = new Float32Array( count );

		for ( let i = 0; i < count; i ++ ) {

			const t = i / ( count - 1 );
			values[ i ] = this._evaluateAt( t );

		}

		return values;

	}

	_evaluateAt( t ) {

		// Find surrounding control points
		if ( this.points.length < 2 ) return 0;

		if ( t <= this.points[ 0 ].x ) return this.points[ 0 ].y;
		if ( t >= this.points[ this.points.length - 1 ].x ) return this.points[ this.points.length - 1 ].y;

		for ( let i = 0; i < this.points.length - 1; i ++ ) {

			const p0 = this.points[ i ];
			const p1 = this.points[ i + 1 ];

			if ( t >= p0.x && t <= p1.x ) {

				const localT = ( t - p0.x ) / ( p1.x - p0.x );
				// Smoothstep interpolation for smooth curves
				const s = localT * localT * ( 3 - 2 * localT );
				return p0.y + ( p1.y - p0.y ) * s;

			}

		}

		return 0;

	}

	setPoints( points ) {

		this.points = [ ...points ].sort( ( a, b ) => a.x - b.x );
		this.draw();

	}

	setFromArray( arr ) {

		// Convert 32-sample array to control points
		this.points = [];
		const step = Math.max( 1, Math.floor( arr.length / 6 ) );
		for ( let i = 0; i < arr.length; i += step ) {

			this.points.push( { x: i / ( arr.length - 1 ), y: arr[ i ] } );

		}

		// Always include first and last
		if ( this.points[ 0 ].x !== 0 ) this.points.unshift( { x: 0, y: arr[ 0 ] } );
		if ( this.points[ this.points.length - 1 ].x !== 1 ) this.points.push( { x: 1, y: arr[ arr.length - 1 ] } );

		this.points.sort( ( a, b ) => a.x - b.x );
		this.draw();

	}

	draw() {

		const ctx = this.ctx;
		const w = this.canvas.width;
		const h = this.canvas.height;
		const pad = 8;

		ctx.clearRect( 0, 0, w, h );

		// Background
		ctx.fillStyle = 'rgba(10, 10, 25, 0.6)';
		ctx.fillRect( 0, 0, w, h );

		// Grid lines
		ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
		ctx.lineWidth = 1;
		for ( let i = 0; i <= 4; i ++ ) {

			const x = pad + ( ( w - pad * 2 ) * i ) / 4;
			const y = pad + ( ( h - pad * 2 ) * i ) / 4;
			ctx.beginPath();
			ctx.moveTo( x, pad );
			ctx.lineTo( x, h - pad );
			ctx.stroke();
			ctx.beginPath();
			ctx.moveTo( pad, y );
			ctx.lineTo( w - pad, y );
			ctx.stroke();

		}

		// Curve fill
		ctx.beginPath();
		ctx.moveTo( pad, h - pad );

		const steps = 100;
		for ( let i = 0; i <= steps; i ++ ) {

			const t = i / steps;
			const val = this._evaluateAt( t );
			const x = pad + t * ( w - pad * 2 );
			const y = h - pad - val * ( h - pad * 2 );
			ctx.lineTo( x, y );

		}

		ctx.lineTo( w - pad, h - pad );
		ctx.closePath();

		const gradient = ctx.createLinearGradient( 0, 0, 0, h );
		gradient.addColorStop( 0, this.color + '40' );
		gradient.addColorStop( 1, this.color + '05' );
		ctx.fillStyle = gradient;
		ctx.fill();

		// Curve line
		ctx.beginPath();
		for ( let i = 0; i <= steps; i ++ ) {

			const t = i / steps;
			const val = this._evaluateAt( t );
			const x = pad + t * ( w - pad * 2 );
			const y = h - pad - val * ( h - pad * 2 );

			if ( i === 0 ) ctx.moveTo( x, y );
			else ctx.lineTo( x, y );

		}

		ctx.strokeStyle = this.color;
		ctx.lineWidth = 3;
		ctx.stroke();

		// Control points
		for ( let i = 0; i < this.points.length; i ++ ) {

			const p = this.points[ i ];
			const x = pad + p.x * ( w - pad * 2 );
			const y = h - pad - p.y * ( h - pad * 2 );
			const isHovered = i === this.hoverIndex;
			const isDragging = i === this.draggingIndex;
			const radius = ( isHovered || isDragging ) ? 10 : 7;

			// Glow
			if ( isHovered || isDragging ) {

				ctx.beginPath();
				ctx.arc( x, y, 18, 0, Math.PI * 2 );
				ctx.fillStyle = this.color + '30';
				ctx.fill();

			}

			// Point
			ctx.beginPath();
			ctx.arc( x, y, radius, 0, Math.PI * 2 );
			ctx.fillStyle = isDragging ? '#ffffff' : this.color;
			ctx.fill();
			ctx.strokeStyle = '#ffffff';
			ctx.lineWidth = 2;
			ctx.stroke();

		}

	}

}
