export class ScreenCapture {

	constructor( renderer ) {

		this.renderer = renderer;
		this.canvas = renderer.domElement;
		this.mediaRecorder = null;
		this.chunks = [];
		this._isRecording = false;

	}

	takeScreenshot() {

		// Force a render to ensure fresh frame
		const dataUrl = this.canvas.toDataURL( 'image/png' );
		const link = document.createElement( 'a' );
		link.download = 'particles_' + Date.now() + '.png';
		link.href = dataUrl;
		document.body.appendChild( link );
		link.click();
		document.body.removeChild( link );

	}

	startRecording() {

		if ( this._isRecording ) return;

		this.chunks = [];

		try {

			const stream = this.canvas.captureStream( 60 );

			// Try VP9 first, fall back to VP8, then default
			const mimeTypes = [
				'video/webm;codecs=vp9',
				'video/webm;codecs=vp8',
				'video/webm'
			];

			let selectedMime = 'video/webm';
			for ( const mime of mimeTypes ) {

				if ( MediaRecorder.isTypeSupported( mime ) ) {

					selectedMime = mime;
					break;

				}

			}

			this.mediaRecorder = new MediaRecorder( stream, {
				mimeType: selectedMime,
				videoBitsPerSecond: 8000000 // 8 Mbps
			} );

			this.mediaRecorder.ondataavailable = ( e ) => {

				if ( e.data.size > 0 ) {

					this.chunks.push( e.data );

				}

			};

			this.mediaRecorder.onstop = () => {

				const blob = new Blob( this.chunks, { type: selectedMime } );
				const url = URL.createObjectURL( blob );
				const link = document.createElement( 'a' );
				link.download = 'particles_' + Date.now() + '.webm';
				link.href = url;
				document.body.appendChild( link );
				link.click();
				document.body.removeChild( link );
				URL.revokeObjectURL( url );
				this.chunks = [];

			};

			this.mediaRecorder.start();
			this._isRecording = true;

		} catch ( e ) {

			console.error( 'Failed to start recording:', e );

		}

	}

	stopRecording() {

		if ( ! this._isRecording || ! this.mediaRecorder ) return;

		this.mediaRecorder.stop();
		this._isRecording = false;

	}

	toggleRecording() {

		if ( this._isRecording ) {

			this.stopRecording();

		} else {

			this.startRecording();

		}

		return this._isRecording;

	}

	isRecording() {

		return this._isRecording;

	}

}
