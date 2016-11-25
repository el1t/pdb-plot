import { VNode } from 'vue';
import * as _Vue from 'vue';

declare class Vue<P> extends _Vue {
	_propsBrand: P;
}

declare global {
	namespace JSX {
		interface Element extends VNode { }
		interface ElementClass extends Vue<any> { }
		interface ElementAttributesProperty {
			_propsBrand: {};
		}

		interface IntrinsicElements {
			div: any;
			h1: any;
			button: any;
			aside: any;
			canvas: any;
			label: any;
			input: any;
		}
	}
}
