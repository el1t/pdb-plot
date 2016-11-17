import * as Vue from 'vue';
import Component from 'vue-class-component';

@Component({
	props: {
		propMessage: String
	},
	template: `
    <div>
      <input v-model="msg">
      <p>prop: {{propMessage}}</p>
      <p>msg: {{msg}}</p>
      <p>helloMsg: {{helloMsg}}</p>
      <p>computed msg: {{computedMsg}}</p>
      <button @click="greet">Greet</button>
    </div>
  `
})
class App {
	// initial data
	msg = 123

	// use prop values for initial data
	helloMsg = 'Hello, ' + this.propMessage

	// lifecycle hook
	mounted () {
		this.greet()
	}

	// computed
	get computedMsg () {
		return 'computed ' + this.msg
	}

	// method
	greet () {
		alert('greeting: ' + this.msg)
	}
}
