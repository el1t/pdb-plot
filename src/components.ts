import * as Vue from 'vue';
import Component from 'vue-class-component';
import { Setting, Graph } from 'app';

@Component({
	props: {
		propMessage: String
	},
	template: `
<aside id='panel'>
	<label>
		Iterations
		<input v-model="settings.iterations">
	</label>
	<label>
		µ Resolution
		<input v-model="settings.muRes">
	</label>
	<label>
		x Resolution
		<input v-model="settings.xRes">
	</label>
	<label>
		Canvas Width
		<input v-model="canvas.width">
	</label>
	<label>
		Canvas Height
		<input v-model="canvas.height">
	</label>
	<button @click="start">Start</button>
	<button @click="stop">Stop</button>
	<button @click="clear">Clear</button>
</aside>`
} as Vue.ComponentOptions<any>)
export default class App extends Vue {
	// initial data
	settings: Setting;
	graph: Graph;
	canvas: Vue;

	start() {
		this.graph.start();
	}
	stop() {
		this.graph.stop();
	}
	clear() {
		this.graph.clear();
	}
}
