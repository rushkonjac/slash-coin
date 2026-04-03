import Matter from "matter-js";

export class PhysicsWorld {
  engine: Matter.Engine;
  world: Matter.World;
  platform: Matter.Body;
  wallLeft: Matter.Body;
  wallRight: Matter.Body;
  dividerY: number;

  constructor(
    public width: number,
    public height: number,
  ) {
    this.engine = Matter.Engine.create({
      gravity: { x: 0, y: 1.8, scale: 1 },
    });
    this.world = this.engine.world;

    this.dividerY = height * 0.5;
    const wallThickness = 20;
    const platformH = 30;

    this.platform = Matter.Bodies.rectangle(
      width / 2,
      height - platformH / 2,
      width,
      platformH,
      { isStatic: true, friction: 0.6, restitution: 0.2, label: "platform" },
    );

    this.wallLeft = Matter.Bodies.rectangle(
      -wallThickness / 2,
      height / 2,
      wallThickness,
      height * 2,
      { isStatic: true, friction: 0.3, restitution: 0.3, label: "wall" },
    );

    this.wallRight = Matter.Bodies.rectangle(
      width + wallThickness / 2,
      height / 2,
      wallThickness,
      height * 2,
      { isStatic: true, friction: 0.3, restitution: 0.3, label: "wall" },
    );

    Matter.Composite.add(this.world, [this.platform, this.wallLeft, this.wallRight]);
  }

  step(dt: number) {
    Matter.Engine.update(this.engine, dt * 1000);
  }

  addBody(body: Matter.Body) {
    Matter.Composite.add(this.world, body);
  }

  removeBody(body: Matter.Body) {
    Matter.Composite.remove(this.world, body);
  }

  createProductBody(x: number, y: number, radius: number): Matter.Body {
    return Matter.Bodies.circle(x, y, radius, {
      friction: 0.4,
      restitution: 0.3,
      density: 0.002,
      label: "product",
    });
  }
}
