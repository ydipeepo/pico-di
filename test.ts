import { describe, it } from "mocha";
import { expect } from "chai";
import { createProvider } from ".";

class A { static called = 0; constructor() { ++A.called; } }
class B { static called = 0; constructor({ a }: { a: A }) { void a; ++B.called; } }
class C { static called = 0; constructor({ a, b }: { a: A, b: B }) { void a; void b; ++C.called; } }

const reset = () => {
	A.called = 0;
	B.called = 0;
	C.called = 0;
};

describe("Service provider", () => {

	it("registration: constructor", () => {
		{
			const p = createProvider<{ a: A }>(b => b
				.addSingleton("a", A));
			expect([...p.registry.names]).to.deep.equal(["a"]);
		}
		{
			const p = createProvider<{ a: A, b: B }>(b => b
				.addSingleton("a", A)
				.addSingleton("b", B));
			expect([...p.registry.names]).to.deep.equal(["a", "b"]);
		}
		{
			const p = createProvider<{ a: A, b: B, c: C }>(b => b
				.addSingleton("a", A)
				.addSingleton("b", B)
				.addSingleton("c", C));
			expect([...p.registry.names]).to.deep.equal(["a", "b", "c"]);
		}
	});

	it("registration: factory", () => {
		{
			const p = createProvider<{ a: A }>(b => b
				.addSingleton("a", () => new A()));
			expect([...p.registry.names]).to.deep.equal(["a"]);
		}
		{
			const p = createProvider<{ a: A, b: B }>(b => b
				.addSingleton("a", () => new A())
				.addSingleton("b", c => new B(c)));
			expect([...p.registry.names]).to.deep.equal(["a", "b"]);
		}
		{
			const p = createProvider<{ a: A, b: B, c: C }>(b => b
				.addSingleton("a", () => new A())
				.addSingleton("b", c => new B(c))
				.addSingleton("c", c => new C(c)));
			expect([...p.registry.names]).to.deep.equal(["a", "b", "c"]);
		}
	});

	it("registered lifetime", () => {
		const p = createProvider<{ a: A, b: B, c: C }>(b => b
			.addSingleton("a", A)
			.addScoped("b", B)
			.addTransient("c", C));
		expect(p.registry.get("a").lifetime).to.equal("singleton");
		expect(p.registry.get("b").lifetime).to.equal("scoped");
		expect(p.registry.get("c").lifetime).to.equal("transient");
	});

});

describe("Service scope", () => {

	it("singleton scope", () => {
		reset();
		const p = createProvider<{ a: A }>(b => b.addSingleton("a", A));
		{
			const c = p.begin();
			expect(A.called).to.equal(0);
			c.a;
			expect(A.called).to.equal(1);
			c.a;
			expect(A.called).to.equal(1);
		}
		{
			const c = p.begin();
			expect(A.called).to.equal(1);
			c.a;
			expect(A.called).to.equal(1);
			c.a;
			expect(A.called).to.equal(1);
		}
	});

	it("scoped scope", () => {
		reset();
		const p = createProvider<{ a: A }>(b => b.addScoped("a", A));
		{
			const c = p.begin();
			expect(A.called).to.equal(0);
			c.a;
			expect(A.called).to.equal(1);
			c.a;
			expect(A.called).to.equal(1);
		}
		{
			const c = p.begin();
			expect(A.called).to.equal(1);
			c.a;
			expect(A.called).to.equal(2);
			c.a;
			expect(A.called).to.equal(2);
		}
	});

	it("transient scope", () => {
		reset();
		const p = createProvider<{ a: A }>(b => b.addTransient("a", A));
		{
			const c = p.begin();
			expect(A.called).to.equal(0);
			c.a;
			expect(A.called).to.equal(1);
			c.a;
			expect(A.called).to.equal(2);
		}
		{
			const c = p.begin();
			expect(A.called).to.equal(2);
			c.a;
			expect(A.called).to.equal(3);
			c.a;
			expect(A.called).to.equal(4);
		}
	});

});

describe("Dependent context", () => {
	
	it("instancing singleton", () => {
		reset();
		const p = createProvider<{ a: A, b: B, c: C }>(builder => builder
			.addSingleton("a", A)
			.addSingleton("b", B)
			.addSingleton("c", C));
		{
			const c = p.begin();
			expect(A.called).to.equal(0);
			expect(B.called).to.equal(0);
			expect(C.called).to.equal(0);
			c.a;
			expect(A.called).to.equal(1);
			expect(B.called).to.equal(0);
			expect(C.called).to.equal(0);
			c.b;
			expect(A.called).to.equal(1);
			expect(B.called).to.equal(1);
			expect(C.called).to.equal(0);
			c.c;
			expect(A.called).to.equal(1);
			expect(B.called).to.equal(1);
			expect(C.called).to.equal(1);
		}
		{
			const c = p.begin();
			expect(A.called).to.equal(1);
			expect(B.called).to.equal(1);
			expect(C.called).to.equal(1);
			c.a;
			expect(A.called).to.equal(1);
			expect(B.called).to.equal(1);
			expect(C.called).to.equal(1);
			c.b;
			expect(A.called).to.equal(1);
			expect(B.called).to.equal(1);
			expect(C.called).to.equal(1);
			c.c;
			expect(A.called).to.equal(1);
			expect(B.called).to.equal(1);
			expect(C.called).to.equal(1);
		}
	});

	it("instancing scoped", () => {
		reset();
		const p = createProvider<{ a: A, b: B, c: C }>(builder => builder
			.addScoped("a", A)
			.addScoped("b", B)
			.addScoped("c", C));
		{
			const c = p.begin();
			expect(A.called).to.equal(0);
			expect(B.called).to.equal(0);
			expect(C.called).to.equal(0);
			c.a;
			expect(A.called).to.equal(1);
			expect(B.called).to.equal(0);
			expect(C.called).to.equal(0);
			c.b;
			expect(A.called).to.equal(1);
			expect(B.called).to.equal(1);
			expect(C.called).to.equal(0);
			c.c;
			expect(A.called).to.equal(1);
			expect(B.called).to.equal(1);
			expect(C.called).to.equal(1);
		}
		{
			const c = p.begin();
			expect(A.called).to.equal(1);
			expect(B.called).to.equal(1);
			expect(C.called).to.equal(1);
			c.a;
			expect(A.called).to.equal(2);
			expect(B.called).to.equal(1);
			expect(C.called).to.equal(1);
			c.b;
			expect(A.called).to.equal(2);
			expect(B.called).to.equal(2);
			expect(C.called).to.equal(1);
			c.c;
			expect(A.called).to.equal(2);
			expect(B.called).to.equal(2);
			expect(C.called).to.equal(2);
		}
	});

	it("instancing transient", () => {
		reset();
		const p = createProvider<{ a: A, b: B, c: C }>(builder => builder
			.addTransient("a", A)
			.addTransient("b", B)
			.addTransient("c", C));
		{
			const c = p.begin();
			expect(A.called).to.equal(0);
			expect(B.called).to.equal(0);
			expect(C.called).to.equal(0);
			c.a;
			expect(A.called).to.equal(1);
			expect(B.called).to.equal(0);
			expect(C.called).to.equal(0);
			c.b;
			expect(A.called).to.equal(2);
			expect(B.called).to.equal(1);
			expect(C.called).to.equal(0);
			c.c;
			expect(A.called).to.equal(4);
			expect(B.called).to.equal(2);
			expect(C.called).to.equal(1);
		}
		{
			const c = p.begin();
			expect(A.called).to.equal(4);
			expect(B.called).to.equal(2);
			expect(C.called).to.equal(1);
			c.a;
			expect(A.called).to.equal(5);
			expect(B.called).to.equal(2);
			expect(C.called).to.equal(1);
			c.b;
			expect(A.called).to.equal(6);
			expect(B.called).to.equal(3);
			expect(C.called).to.equal(1);
			c.c;
			expect(A.called).to.equal(8);
			expect(B.called).to.equal(4);
			expect(C.called).to.equal(2);
		}
	});

	it("instancing mixed: root to leaf path", () => {
		reset();
		const p = createProvider<{ a: A, b: B, c: C }>(builder => builder
			.addSingleton("a", A)
			.addScoped("b", B)
			.addTransient("c", C));
		{
			const c = p.begin();
			expect(A.called).to.equal(0);
			expect(B.called).to.equal(0);
			expect(C.called).to.equal(0);
			c.c;
			expect(A.called).to.equal(1);
			expect(B.called).to.equal(1);
			expect(C.called).to.equal(1);
			c.b;
			expect(A.called).to.equal(1);
			expect(B.called).to.equal(1);
			expect(C.called).to.equal(1);
			c.a;
			expect(A.called).to.equal(1);
			expect(B.called).to.equal(1);
			expect(C.called).to.equal(1);
		}
		{
			const c = p.begin();
			expect(A.called).to.equal(1);
			expect(B.called).to.equal(1);
			expect(C.called).to.equal(1);
			c.c;
			expect(A.called).to.equal(1);
			expect(B.called).to.equal(2);
			expect(C.called).to.equal(2);
			c.b;
			expect(A.called).to.equal(1);
			expect(B.called).to.equal(2);
			expect(C.called).to.equal(2);
			c.a;
			expect(A.called).to.equal(1);
			expect(B.called).to.equal(2);
			expect(C.called).to.equal(2);
		}
	});

	it("instancing mixed: leaf to root path", () => {
		reset();
		const p = createProvider<{ a: A, b: B, c: C }>(builder => builder
			.addSingleton("a", A)
			.addScoped("b", B)
			.addTransient("c", C));
		{
			const c = p.begin();
			expect(A.called).to.equal(0);
			expect(B.called).to.equal(0);
			expect(C.called).to.equal(0);
			c.a;
			expect(A.called).to.equal(1);
			expect(B.called).to.equal(0);
			expect(C.called).to.equal(0);
			c.b;
			expect(A.called).to.equal(1);
			expect(B.called).to.equal(1);
			expect(C.called).to.equal(0);
			c.c;
			expect(A.called).to.equal(1);
			expect(B.called).to.equal(1);
			expect(C.called).to.equal(1);
		}
		{
			const c = p.begin();
			expect(A.called).to.equal(1);
			expect(B.called).to.equal(1);
			expect(C.called).to.equal(1);
			c.a;
			expect(A.called).to.equal(1);
			expect(B.called).to.equal(1);
			expect(C.called).to.equal(1);
			c.b;
			expect(A.called).to.equal(1);
			expect(B.called).to.equal(2);
			expect(C.called).to.equal(1);
			c.c;
			expect(A.called).to.equal(1);
			expect(B.called).to.equal(2);
			expect(C.called).to.equal(2);
		}
	});

});
