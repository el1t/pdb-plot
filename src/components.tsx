import * as Vue from 'vue';
import Component from 'vue-class-component';
import { Setting, Graph } from 'app';

// Settings panel component
@Component({} as Vue.ComponentOptions<any>)
export default class App extends Vue {
	// initial data
	settings: Setting;
	graph: Graph;
	canvas: Canvas;
	notifier: Notifier;

	// Begin graphing
	start() {
		this.graph.start();
	}
	// Stop graphing
	stop() {
		this.graph.stop();
	}
	// Export as image, notify if failed
	exportImage() {
		// This could return false if unsuccessful
		if (!this.graph.exportImage())
			this.notifier.alert('Unfortunately, your browser does not support this feature.', 3);
	}
	// Clear graph
	clear() {
		this.graph.clear();
	}
	// Vue render function
	render(h: Vue.CreateElement): Vue.VNode {
		const props = {
			'Iterations'    : ['settings', 'iterations'],
			'mu Resolution' : ['settings', 'muRes'],
			'x Resolution'  : ['settings', 'xRes'],
			'Canvas Width'  : ['canvas', 'width'],
			'Canvas Height' : ['canvas', 'height'],
		};
		return (
			<aside id='panel'>
				{Object.keys(props).map((key) => {
					const [prop, value] = props[key];
					return (
					<label>
						{key}
						<input domPropsValue={this[prop][value]}
						       onInput={(e: Event) => this[prop][value] = (e.target as HTMLInputElement).value}/>
					</label>
				)})}
				<button onClick={this.start}>Start</button>
				<button onClick={this.stop}>Stop</button>
				<button onClick={this.exportImage}>Save Image</button>
				<button onClick={this.clear}>Clear</button>
			</aside>
		)
	}
}

// Canvas component
@Component({} as Vue.ComponentOptions<any>)
export class Canvas extends Vue {
	width: number;
	height: number;

	render(h: Vue.CreateElement): Vue.VNode {
		return <canvas id="plot" domPropsWidth={this.width} domPropsHeight={this.height}/>
	}
}

@Component({
	props: {
		text: '',
		showing: false
	}
} as Vue.ComponentOptions<any>)
export class Notifier extends Vue {
	private text: string;
	private showing: boolean;
	private timeoutId: number;

	alert(message: string, duration: number = 1): void {
		this.text = message;
		this.showing = true;
		if (this.timeoutId) {
			clearTimeout(this.timeoutId);
			this.timeoutId = null;
		}
		this.timeoutId = window.setTimeout(() => {
			this.showing = false;
		}, duration * 1000);
	}
	render(h: Vue.CreateElement): Vue.VNode {
		if (this.showing)
			return <h1 id="notification">{this.text}</h1>
	}
}
