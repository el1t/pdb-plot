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
