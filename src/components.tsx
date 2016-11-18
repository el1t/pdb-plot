import * as Vue from 'vue';
import Component from 'vue-class-component';
import { Setting, Graph } from 'app';

@Component({} as Vue.ComponentOptions<any>)
export default class App extends Vue {
	// initial data
	settings: Setting;
	graph: Graph;
	canvas: Canvas;

	start() {
		this.graph.start();
	}
	stop() {
		this.graph.stop();
	}
	clear() {
		this.graph.clear();
	}
	render(h: Vue.CreateElement) {
		const self = this;
		const props = {
			get Iterations()         { return self.settings.iterations; },
			set Iterations(n)        { self.settings.iterations = n; },
			get ['mu Resolution']()  { return self.settings.muRes; },
			set ['mu Resolution'](n) { self.settings.muRes = n; },
			get ['x Resolution']()   { return self.settings.xRes; },
			set ['x Resolution'](n)  { self.settings.xRes = n; },
			get ['Canvas Width']()   { return self.canvas.width; },
			set ['Canvas Width'](n)  { self.canvas.width = n; },
			get ['Canvas Height']()  { return self.canvas.height; },
			set ['Canvas Height'](n) { self.canvas.height = n; }
		};
		return (
			<aside id='panel'>
				{Object.keys(props).map((prop) => (
					<label>
						{prop}
						<input domPropsValue={props[prop]} onInput={(e: Event) => props[prop] = (e.target as HTMLInputElement).value}/>
					</label>
				))}
				<button onClick={this.start}>Start</button>
				<button onClick={this.stop}>Stop</button>
				<button onClick={this.clear}>Clear</button>
			</aside>
		)
	}
}

@Component({} as Vue.ComponentOptions<any>)
export class Canvas extends Vue {
	width: number;
	height: number;

	render (h) {
		return <canvas id="plot" domPropsWidth={this.width} domPropsHeight={this.height}/>
	}
}
