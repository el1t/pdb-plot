const Chart = require('chart.js');
class Setting {
	xRange: [number, number];
	muRange: [number, number];
	get xSpan() {
		return this.xRange[1] - this.xRange[0];
	}
	get muSpan() {
		return this.muRange[1] - this.muRange[0];
	}
	xRes: number;
	muRes: number;
	iterations: number;
	constructor({xRange, muRange, xRes, muRes, iterations}) {
		xRange = xRange || [0, 1];
		muRange = muRange || [2.9, 4];
		this.xRange = xRange as [number, number];
		this.muRange = muRange as [number, number];
		this.xRes = xRes;
		this.muRes = muRes;
		this.iterations = iterations;
	}
}
const PRESETS: { sparse: Setting, normal: Setting, dense: Setting } = {
	sparse: new Setting({
		xRange: null,
		muRange: null,
		xRes: 64,
		muRes: 160,
		iterations: 2048
	}),
	normal: new Setting({
		xRange: null,
		muRange: null,
		xRes: 128,
		muRes: 192,
		iterations: 2048
	}),
	dense: new Setting({
		xRange: null,
		muRange: null,
		xRes: 192,
		muRes: 384,
		iterations: 2048
	})
};
let settings: Setting = new Setting({
	xRange: null,
	muRange: null,
	xRes: window.innerHeight * window.devicePixelRatio,
	muRes: window.innerWidth * window.devicePixelRatio,
	iterations: 3000
});
// settings = PRESETS.dense;

class Coordinate {
	public x: number;
	public y: number;
	get hashable(): number {
		return this.x * 1000 + this.y;
	}
	constructor(x, y) {
		this.x = x;
		this.y = y;
	}
}

class Plotter {
	canvas: any;
	context: CanvasRenderingContext2D;
	imageData: ImageData;
	data: Coordinate[];
	constructor(canvas: HTMLCanvasElement, data: Coordinate[]) {
		this.canvas = canvas;
		this.data = data;
		this.context = this.canvas.getContext('2d');
		this.initialize();
	}
	// Setup canvas and draw axes
	private initialize(): void {
		const ratio = window.devicePixelRatio || 1;
		this.canvas.height = window.innerHeight * ratio;
		this.canvas.width = window.innerWidth * ratio;
		this.imageData = this.context.getImageData(0, 0, this.canvas.width, this.canvas.height);
		// this.canvas.minX = settings.xRange[0];
		// this.canvas.maxX = settings.xRange[1];
		// this.canvas.minY = settings.muRange[0];
		// this.canvas.maxY = settings.muRange[1];
	}
	// Manually set pixel
	private set(x, y, r, g, b, a): void {
		y = this.canvas.height - y;
		const index = (x + y * this.canvas.width) * 4;

		this.imageData.data[index] = r;
		this.imageData.data[index + 1] = g;
		this.imageData.data[index + 2] = b;
		this.imageData.data[index + 3] = a;
	}
	// Plot point
	plot(p: Coordinate): void {
		const scaledX = (p.x - settings.muRange[0]) / settings.muSpan * this.canvas.width;
		const scaledY = (p.y - settings.xRange[0]) / settings.xSpan * this.canvas.height;
		this.set(Math.round(scaledX), Math.round(scaledY), 0, 0, 0, 255);
	}
	// Draw frame
	update(): void {
		this.context.putImageData(this.imageData, 0, 0);
	}
}

class Outlet {
	chart: any;
	requestId: number;
	graph: Graph;
	dirty: boolean;
	method: 'chart' | 'canvas' = 'canvas';
	constructor(graph: Graph) {
		this.graph = graph;
		switch (this.method) {
			case 'chart':
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
								position: 'bottom',
								ticks: {
									min: settings.muRange[0],
									steps: 11,
									max: settings.muRange[1]
								}
							}],
							yAxes: [{
								display: true,
								ticks: {
									min: settings.xRange[0],
									max: settings.xRange[1]
								}
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
				break;
			case 'canvas':
				this.chart = new Plotter(document.getElementById('plot') as HTMLCanvasElement, graph.grid);
				let self = this;
				// Observe push actions
				Object.defineProperty(graph.grid, 'push', {
					configurable: false,
					enumerable: false, // hide from for...in
					writable: false,
					value: function(): number {
						for (let i = 0, n = this.length, l = arguments.length; i < l; i++, n++) {
							this[n] = arguments[i];
							self.chart.plot(arguments[i]);
						}
						self.dirty = true;
						return this.length;
					}
				});
				break;
		}
	}
	start() {
		// Update chart every frame
		const step = (): void => {
			if (this.dirty || this.method === 'chart' && this.graph.workers) {
				console.log('yes yes yes')
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
		if (this.dirty || this.method === 'chart' && this.graph.workers) {
			this.chart.update();
			this.dirty = false;
		}
		console.log('Halted');
	}
}

class Graph {
	grid: Coordinate[] = [];
	method: 'iterate' | 'mu' = 'mu';
	hash: Set<number>;
	timer: number; // id of timeout for single-threaded computation
	outlet: Outlet;
	workers: Worker[];
	finishedWorkers: number; // Count number of completed workers

	constructor() {
		// Check for webworker support
		const hasWebworker = typeof Worker === 'function';
		if (hasWebworker) {
			// Use half of available threads to save CPU for DOM refreshing
			const threads = Math.ceil(navigator['hardwareConcurrency'] / 2) || 2;
			console.log(`Web workers enabled, spawning ${threads} threads.`);
			this.finishedWorkers = 0;
			this.workers = [];
			for (let thread = 0; thread < threads; thread++)
				this.workers.push(new Worker('worker.js'))
		}
		this.outlet = new Outlet(this);
		this.initialize();
	}

	private initialize(): void {
		this.grid.length = 0;
		this.hash = new Set();
		switch (this.method) {
			case 'iterate':
				// Initialize uniform grid
				for (let mu = 0; mu < settings.muRes; mu++)
					for (let x = 1; x < settings.xRes; x++)
						this.grid.push(new Coordinate(settings.muRange[0] + mu / settings.muRes * settings.muSpan,
							settings.xRange[0] + x / settings.xRes * settings.xSpan));
				break;
		}
	}
	private startWorkers(): boolean {
		if (!this.workers) return false;
		const split: number = settings.xRes / this.workers.length;
		let low: number = 1;
		for (const worker of this.workers) {
			switch (this.method) {
				case 'iterate':
					const current = Math.ceil(low - 1) * settings.muRes;
					worker.onmessage = (e: MessageEvent): void => {
						if (!e.data) {
							this.deleteWorker(worker);
							return;
						}
						// split = e.data.length
						for (let i = 0; i < e.data.length; i++) {
							// TODO: fix edge case when splitting work
							if (current + i >= this.grid.length) break;
							if (!e.data[i]) continue; // coalesced point
							this.grid[current + i].x = e.data[i][0];
							this.grid[current + i].y = e.data[i][1];
						}
					};
					break;
				case 'mu':
					worker.onmessage = (e: MessageEvent): void => {
						if (!e.data) {
							this.deleteWorker(worker);
							return;
						}
						this.grid.push(new Coordinate(e.data[0], e.data[1]));
					};
			}
			worker.postMessage([this.method, Math.ceil(low), Math.ceil(low + split), settings]);
			low += split;
		}
		return true;
	}
	private startSingleThread(): boolean {
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
					this.hash = new Set();
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
							this.hash.add(point.hashable);
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
					xVals.push(settings.xRange[0] + x / settings.xRes * settings.xSpan);
				// Main loop
				this.timer = window.setInterval(() => {
					this.hash = new Set();
					tempMu = settings.muRange[0] + mu++ / settings.muRes * settings.muSpan;
					for (let xVal of xVals) {
						// Iterate a bunch of times
						for (let i = 0; i < settings.iterations - 3; i += 4) {
							xVal = tempMu * xVal * (1 - xVal);
							xVal = tempMu * xVal * (1 - xVal);
							xVal = tempMu * xVal * (1 - xVal);
							xVal = tempMu * xVal * (1 - xVal);
						}
						// Ignore coalesced points
						if (!this.hash.has(xVal)) {
							this.grid.push(new Coordinate(tempMu, xVal));
							this.hash.add(xVal);
						}
					}
					this.outlet.dirty = true;
					if (mu > settings.muRes) {
						this.stop();
					}
				}, 10);
				break;
		}
		return true;
	}
	private deleteWorker(worker: Worker): void {
		console.log(`Deleting worker #${this.workers.indexOf(worker) + 1}`);
		delete this.workers[this.workers.indexOf(worker)];
		// If all workers are finished, stop rendering
		if (++this.finishedWorkers == this.workers.length)
			this.outlet.stop();
	}

	start(): Graph {
		if (!this.startWorkers()) {
			this.startSingleThread();
		}
		// Start updating outlet
		this.outlet.start();
		return this;
	}
	stop(): Graph {
		if (this.workers) {
			// Terminate all webworkers
			for (const worker of this.workers) {
				if (worker)
					worker.terminate();
			}
			this.workers.length = 0;
		} else if (this.timer) {
			// Halt single-threaded loop
			clearInterval(this.timer);
			this.timer = null;
		}
		this.outlet.stop();
		return this;
	}
}

const graph = new Graph();
graph.start();
