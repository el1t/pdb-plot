// import { Observable } from 'rxjs/observable';
const Chart = require('chart.js');
interface Setting {
	xRes: number;
	muRes: number;
	iterations: number;
}
const PRESETS: { sparse: Setting, normal: Setting, dense: Setting } = {
	sparse: {
		xRes: 70,
		muRes: 150,
		iterations: 1000
	},
	normal: {
		xRes: 100,
		muRes: 200,
		iterations: 1000
	},
	dense: {
		xRes: 200,
		muRes: 400,
		iterations: 1000
	}
};
let settings: Setting = {
	xRes: 30,
	muRes: 500,
	iterations: 300
};
settings = PRESETS.dense;

class Coordinate {
	public x: number;
	public y: number;
	get hashable() {
		return this.x * 1000 + this.y;
	}
	constructor(x, y) {
		this.x = x;
		this.y = y;
	}
	dist(c: Coordinate) {
		return Math.sqrt((this.x - c.x)^2 + (this.y - c.y)^2);
	}
	eq(c: Coordinate) {
		// Ignore this.x because mu should always be equal
		return Math.abs(this.hashable - c.hashable) <= 0.0001;
	}
	compareTo(c: Coordinate) {
		return this.hashable - c.hashable;
	}
}

class Outlet {
	chart: any;
	requestId: number;
	graph: Graph;
	dirty: boolean;
	constructor(graph: Graph) {
		this.graph = graph;
		this.chart = new Chart(document.getElementById('plot'), {
			type: 'line',
			data: {
				datasets: [{
					label: 'Scatter Dataset',
					data: graph.grid
				}]
			},
			options: {
				scales: {
					xAxes: [{
						type: 'linear',
						position: 'bottom'
					}]
				},
				elements: {
					point: {
						radius: 0.5
					},
				},
				showLines: false,
				animation: false
			}
		});
	}
	start() {
		// Update chart every frame
		const step = () => {
			if (this.dirty) {
				this.chart.update();
				this.dirty = false;
			}
			this.requestId = requestAnimationFrame(step);
		};
		step();
	}
	stop() {
		cancelAnimationFrame(this.requestId);
		this.requestId = null;
	}
}

class Graph {
	grid: Coordinate[] = [];
	method: 'iterate' | 'mu' = 'mu';
	hash: Map<number, boolean>;
	timer: number;
	outlet: Outlet;
	constructor() {
		this.initialize();
		this.outlet = new Outlet(this);
	}
	initialize() {
		this.grid = [];
		this.hash = new Map();
		switch (this.method) {
			case 'iterate':
				// Initialize uniform grid
				for (let mu = 0; mu < settings.muRes; mu++)
					for (let x = 0; x < settings.xRes; x++)
						this.grid.push(new Coordinate(2.9 + mu / settings.muRes * 1.1, x / settings.xRes));
				break;
			case 'mu':
				break;
		}
	}
	start() {
		// Clear previous task if running
		if (this.timer) {
			clearTimeout(this.timer);
			this.timer = null;
		}
		switch (this.method) {
			case 'iterate':
				let iterations: number = 0;
				// Main loop
				this.timer = window.setInterval(() => {
					iterations++;
					let point: Coordinate;
					this.hash = new Map();
					// Iterate each point once
					for (let i = 0; i < this.grid.length; i++) {
						if (this.grid[i] === undefined) continue;
						point = this.grid[i];
						point.y = point.x * point.y * (1 - point.y);
						// Remove coalesced points
						if (this.hash.has(point.hashable)) {
							delete this.grid[i];
						} else {
							this.grid[i] = point;
							this.hash.set(point.hashable, true);
						}
					}
					this.outlet.dirty = true;
					// this.grid.sort((a, b) => a.compareTo(b));
					if (iterations > settings.iterations) {
						this.stop();
					}
				}, 10);
				break;
			case 'mu':
				let mu: number = 0;
				let tempMu: number;
				const xVals: number[] = [];
				for (let x = 1; x < settings.xRes; x++)
					xVals.push(x / settings.xRes);
				// Main loop
				this.timer = window.setInterval(() => {
					this.hash = new Map();
					tempMu = 2.9 + mu++ / settings.muRes * 1.1;
					for (let xVal of xVals) {
						// Iterate a bunch of times
						for (let i = 0; i < settings.iterations - 4; i += 5) {
							xVal = tempMu * xVal * (1 - xVal);
							xVal = tempMu * xVal * (1 - xVal);
							xVal = tempMu * xVal * (1 - xVal);
							xVal = tempMu * xVal * (1 - xVal);
							xVal = tempMu * xVal * (1 - xVal);
						}
						// Ignore coalesced points
						if (!this.hash.has(xVal)) {
							this.grid.push(new Coordinate(tempMu, xVal));
							this.hash.set(xVal, true);
						}
					}
					this.outlet.dirty = true;
					if (mu > settings.muRes) {
						this.stop();
					}
				}, 10);
				break;
		}
		// Start updating outlet
		this.outlet.start();
	}
	stop() {
		clearInterval(this.timer);
		this.outlet.stop();
	}
}

const graph = new Graph();
graph.start();
