import { Arbitrary, Array, Effect, Option, Schema } from "effect";
import { describe, expect, it } from "vite-plus/test";

import * as ReelLayout from "./layout.ts";

const pane = (id: string, label: string, weight = 1): ReelLayout.Pane => ({
  id,
  label,
  weight,
});

const LAYOUT: ReelLayout.Layout = [
  {
    id: "c1",
    width: 1 / 2,
    panes: [pane("shell", "Shell"), pane("notes", "Notes")],
  },
  { id: "c2", width: 2 / 3, panes: [pane("diff", "Diff")] },
  { id: "c3", width: 1 / 2, panes: [pane("canvas", "Canvas")] },
];

const ids = (layout: ReelLayout.Layout): ReadonlyArray<readonly string[]> =>
  Array.map(layout, (column) => Array.map(column.panes, ({ id }) => id));

const { MovedPane, PulledOutPane, MovedColumn, ResizedColumn, ResizedPanes } =
  ReelLayout.OutMessage;

const between = (minimum: number, maximum: number) =>
  Arbitrary.schema(Schema.Int.check(Schema.isBetween({ minimum, maximum })));

const weightIn = (minimum: number, maximum: number) =>
  Arbitrary.all([between(1, 9999), between(minimum, maximum)]).pipe(
    Arbitrary.map(([digits, exponent]) => (digits / 10_000) * 10 ** exponent)
  );

const columnIn = (minimum: number, maximum: number) =>
  Arbitrary.all([
    weightIn(minimum, maximum),
    Arbitrary.array(weightIn(minimum, maximum), { maxLength: 5 }),
  ]).pipe(Arbitrary.map(([first, rest]) => Array.prepend(rest, first)));

const anyColumn = columnIn(-319, 308);

const columnOfWeights = (
  weights: Array.NonEmptyReadonlyArray<number>
): ReelLayout.Column => ({
  id: "a",
  width: 1,
  panes: Array.map(weights, (weight, index) =>
    pane(`p${index}`, `P${index}`, weight)
  ),
});

const holds = <A>(
  arbitrary: Arbitrary.Arbitrary<A>,
  property: (value: A) => boolean
): void => {
  expect(
    Arbitrary.formatCheckFailure(
      Effect.runSync(Arbitrary.checkEffect(arbitrary, property))
    )
  ).toBeUndefined();
};

const isWeight = (weight: number | undefined): boolean =>
  weight !== undefined && weight > 0 && Number.isFinite(weight);

describe("ReelLayout.apply", () => {
  it("moves a pane into another column, where it takes the column's mean weight", () => {
    const moved = ReelLayout.apply(
      [
        {
          id: "a",
          width: 1,
          panes: [pane("shell", "Shell"), pane("notes", "Notes")],
        },
        {
          id: "b",
          width: 2 / 3,
          panes: [pane("diff", "Diff", 2), pane("log", "Log", 4)],
        },
      ],
      MovedPane({ paneId: "shell", toColumnId: "b", toIndex: 1 })
    );

    expect(ids(moved)).toStrictEqual([["notes"], ["diff", "shell", "log"]]);
    expect(moved[1]?.panes[1]?.weight).toBe(3);
  });

  it("moves a pane within its column, keeping its weight", () => {
    const moved = ReelLayout.apply(
      [
        {
          id: "a",
          width: 1,
          panes: [pane("a", "A", 2), pane("b", "B"), pane("c", "C")],
        },
      ],
      MovedPane({ paneId: "a", toColumnId: "a", toIndex: 2 })
    );

    expect(ids(moved)).toStrictEqual([["b", "c", "a"]]);
    expect(moved[0]?.panes[2]?.weight).toBe(2);
  });

  it("gives a pane joining a column of huge weights a mean weight that is still a number", () => {
    const huge = columnOfWeights([1.0091e188, 2.1454e304, Number.MAX_VALUE]);

    const moved = ReelLayout.apply(
      [{ id: "z", width: 1, panes: [pane("shell", "Shell")] }, huge],
      MovedPane({ paneId: "shell", toColumnId: "a", toIndex: 0 })
    );

    expect(Number.isFinite(moved[0]?.panes[0]?.weight)).toBe(true);

    const isMeanOf = (
      weights: Array.NonEmptyReadonlyArray<number>
    ): boolean => {
      const joined = ReelLayout.apply(
        [
          { id: "z", width: 1, panes: [pane("shell", "Shell")] },
          columnOfWeights(weights),
        ],
        MovedPane({ paneId: "shell", toColumnId: "a", toIndex: 0 })
      )[0]?.panes[0]?.weight;

      return (
        joined !== undefined &&
        isWeight(joined) &&
        joined >= Math.min(...weights) &&
        joined <= Math.max(...weights)
      );
    };

    holds(anyColumn, isMeanOf);
    holds(columnIn(300, 308), isMeanOf);
  });

  it("drops a column its last pane leaves", () => {
    expect(
      ids(
        ReelLayout.apply(
          LAYOUT,
          MovedPane({ paneId: "diff", toColumnId: "c1", toIndex: 2 })
        )
      )
    ).toStrictEqual([["shell", "notes", "diff"], ["canvas"]]);
  });

  it("pulls a pane into a column of its own, named for it, at its old column's width", () => {
    const pulled = ReelLayout.apply(
      LAYOUT,
      PulledOutPane({ paneId: "notes", maybeBeforeColumnId: Option.some("c2") })
    );

    expect(ids(pulled)).toStrictEqual([
      ["shell"],
      ["notes"],
      ["diff"],
      ["canvas"],
    ]);
    expect(pulled[1]).toMatchObject({ id: "notes", width: 1 / 2 });
    expect(
      Array.map(
        ReelLayout.apply(
          [...LAYOUT, { id: "notes", width: 1, panes: [pane("log", "Log")] }],
          PulledOutPane({ paneId: "notes", maybeBeforeColumnId: Option.none() })
        ),
        ({ id }) => id
      )
    ).toStrictEqual(["c1", "c2", "c3", "notes", "notes/2"]);
  });

  it("moves a pane alone in its column as its column, and leaves it where it is beside itself", () => {
    expect(
      ids(
        ReelLayout.apply(
          LAYOUT,
          PulledOutPane({
            paneId: "diff",
            maybeBeforeColumnId: Option.some("c1"),
          })
        )
      )
    ).toStrictEqual([["diff"], ["shell", "notes"], ["canvas"]]);
    expect(
      ReelLayout.apply(
        LAYOUT,
        PulledOutPane({
          paneId: "diff",
          maybeBeforeColumnId: Option.some("c3"),
        })
      )
    ).toBe(LAYOUT);
  });

  it("reorders columns, resizes a column and weighs its panes by id", () => {
    expect(
      ids(
        ReelLayout.apply(
          LAYOUT,
          MovedColumn({ columnId: "c1", maybeBeforeColumnId: Option.none() })
        )
      )
    ).toStrictEqual([["diff"], ["canvas"], ["shell", "notes"]]);
    expect(
      ids(
        ReelLayout.apply(
          LAYOUT,
          MovedColumn({
            columnId: "c3",
            maybeBeforeColumnId: Option.some("c1"),
          })
        )
      )
    ).toStrictEqual([["canvas"], ["shell", "notes"], ["diff"]]);
    expect(
      ReelLayout.apply(LAYOUT, ResizedColumn({ columnId: "c2", width: 1 }))[1]
        ?.width
    ).toBe(1);
    expect(
      Array.map(
        ReelLayout.apply(
          LAYOUT,
          ResizedPanes({ columnId: "c1", weights: { notes: 0.5, shell: 1.5 } })
        )[0]?.panes ?? [],
        ({ weight }) => weight
      )
    ).toStrictEqual([1.5, 0.5]);
  });

  it("does what a request meant after the columns moved under it", () => {
    const reordered = ReelLayout.apply(
      LAYOUT,
      MovedColumn({ columnId: "c3", maybeBeforeColumnId: Option.some("c1") })
    );

    expect(
      ids(
        ReelLayout.apply(
          reordered,
          MovedPane({ paneId: "notes", toColumnId: "c2", toIndex: 1 })
        )
      )
    ).toStrictEqual([["canvas"], ["shell"], ["diff", "notes"]]);
    expect(
      ReelLayout.apply(
        reordered,
        ResizedColumn({ columnId: "c2", width: 1 })
      )[2]?.width
    ).toBe(1);
  });

  it("leaves a pane alone in its column where it is when it moves into its own column", () => {
    expect(
      ReelLayout.apply(
        LAYOUT,
        MovedPane({ paneId: "diff", toColumnId: "c2", toIndex: 0 })
      )
    ).toStrictEqual(LAYOUT);
    expect(
      ReelLayout.apply(
        LAYOUT,
        MovedPane({ paneId: "diff", toColumnId: "c2", toIndex: 1 })
      )
    ).toStrictEqual(LAYOUT);
  });

  it("changes nothing for a pane or a column the layout does not have", () => {
    expect(
      ReelLayout.apply(
        LAYOUT,
        MovedPane({ paneId: "gone", toColumnId: "c1", toIndex: 0 })
      )
    ).toBe(LAYOUT);
    expect(
      ReelLayout.apply(
        LAYOUT,
        MovedPane({ paneId: "shell", toColumnId: "gone", toIndex: 0 })
      )
    ).toBe(LAYOUT);
    expect(
      ReelLayout.apply(
        LAYOUT,
        MovedColumn({
          columnId: "c1",
          maybeBeforeColumnId: Option.some("gone"),
        })
      )
    ).toBe(LAYOUT);
    expect(
      ReelLayout.apply(LAYOUT, ResizedColumn({ columnId: "gone", width: 1 }))
    ).toStrictEqual(LAYOUT);
  });
});

const notes = "notes";
const diff = "diff";

const into = (columnId: string, index: number) =>
  ReelLayout.Target.Into({ columnId, index });

const gap = (before: string | undefined) =>
  ReelLayout.Target.Gap({
    maybeBeforeColumnId: Option.fromNullishOr(before),
  });

const step = (target: ReelLayout.Target, by: ReelLayout.Step) =>
  ReelLayout.steppedTarget(LAYOUT, notes, target, by);

describe("ReelLayout targets", () => {
  it("asks nothing for a drop where it is, or into a column that is gone", () => {
    expect(ReelLayout.requestOf(LAYOUT, notes, into("c1", 1))).toStrictEqual(
      Option.none()
    );
    expect(ReelLayout.requestOf(LAYOUT, diff, into("c2", 0))).toStrictEqual(
      Option.none()
    );
    expect(ReelLayout.requestOf(LAYOUT, notes, into("gone", 0))).toStrictEqual(
      Option.none()
    );
    expect(ReelLayout.requestOf(LAYOUT, diff, gap("c3"))).toStrictEqual(
      Option.none()
    );
    expect(ReelLayout.requestOf(LAYOUT, notes, gap("c2"))).toStrictEqual(
      Option.some(
        PulledOutPane({
          paneId: "notes",
          maybeBeforeColumnId: Option.some("c2"),
        })
      )
    );
  });

  it("steps a pane sideways through gaps and columns, and up and down a column, within the ends", () => {
    expect(step(into("c1", 1), "Right")).toStrictEqual(gap("c2"));
    expect(step(gap("c2"), "Right")).toStrictEqual(into("c2", 0));
    expect(step(into("c2", 0), "Down")).toStrictEqual(into("c2", 1));
    expect(step(into("c2", 1), "Down")).toStrictEqual(into("c2", 1));
    expect(step(gap("c2"), "Up")).toStrictEqual(gap("c2"));
    expect(step(gap("c1"), "Left")).toStrictEqual(gap("c1"));
    expect(step(gap(undefined), "Right")).toStrictEqual(gap(undefined));
  });

  it("passes over the stops where a drop would change nothing, but where it started", () => {
    expect(
      ReelLayout.steppedTarget(LAYOUT, diff, into("c2", 0), "Right")
    ).toStrictEqual(into("c3", 0));
    expect(
      ReelLayout.steppedTarget(LAYOUT, diff, into("c3", 0), "Left")
    ).toStrictEqual(into("c2", 0));
    expect(
      ReelLayout.steppedTarget(LAYOUT, diff, into("c2", 0), "Left")
    ).toStrictEqual(into("c1", 0));
  });

  it("steps from where a pane started when the column its target named has gone", () => {
    const withoutDiff = Array.filter(LAYOUT, ({ id }) => id !== "c2");

    expect(
      ReelLayout.steppedTarget(withoutDiff, notes, into("c2", 0), "Right")
    ).toStrictEqual(gap("c3"));
    expect(
      ReelLayout.steppedTarget(withoutDiff, notes, into("c2", 0), "Up")
    ).toStrictEqual(into("c1", 0));
  });

  it("reads a pointer over a column's edge band as the gap beside it, else a place by the slots' middles", () => {
    const columns: readonly ReelLayout.ColumnBox[] = [
      { id: "c1", left: 16, right: 416 },
      { id: "c2", left: 432, right: 832 },
    ];

    const middles = [[100, 300], [200]];

    const at = (x: number, y: number) =>
      ReelLayout.targetAtPoint(columns, x, y, (index) => middles[index] ?? []);

    expect(at(20, 50)).toStrictEqual(gap("c1"));
    expect(at(200, 50)).toStrictEqual(into("c1", 0));
    expect(at(200, 200)).toStrictEqual(into("c1", 1));
    expect(at(200, 350)).toStrictEqual(into("c1", 2));
    expect(at(410, 50)).toStrictEqual(gap("c2"));
    expect(at(424, 50)).toStrictEqual(gap("c2"));
    expect(at(900, 50)).toStrictEqual(gap(undefined));
  });

  it("reads the slots of the column under the pointer alone, and none over a gap", () => {
    const columns: readonly ReelLayout.ColumnBox[] = [
      { id: "c1", left: 16, right: 416 },
      { id: "c2", left: 432, right: 832 },
      { id: "c3", left: 848, right: 1248 },
    ];

    const read = (x: number): readonly number[] => {
      const asked: number[] = [];
      ReelLayout.targetAtPoint(columns, x, 50, (index) => {
        asked.push(index);

        return [100];
      });

      return asked;
    };

    expect(read(600)).toStrictEqual([1]);
    expect(read(20)).toStrictEqual([]);
    expect(read(840)).toStrictEqual([]);
    expect(read(2000)).toStrictEqual([]);
  });
});

const width = (columnId: string) => ReelLayout.Splitter.Width({ columnId });

const split = (abovePaneId: string) =>
  ReelLayout.Splitter.Split({ abovePaneId });

describe("ReelLayout.resizeOf", () => {
  it("adds a share to a column's width as the layout holds it, never under a tenth nor over the whole", () => {
    expect(ReelLayout.resizeOf(LAYOUT, width("c1"), -0.05)).toStrictEqual(
      Option.some(ResizedColumn({ columnId: "c1", width: 0.45 }))
    );
    expect(ReelLayout.resizeOf(LAYOUT, width("c1"), -1)).toStrictEqual(
      Option.some(ResizedColumn({ columnId: "c1", width: 0.1 }))
    );
    expect(ReelLayout.resizeOf(LAYOUT, width("c2"), 1)).toStrictEqual(
      Option.some(ResizedColumn({ columnId: "c2", width: 1 }))
    );
  });

  it("moves a share of a column's height between the panes beside a divider, by their ids", () => {
    const column: ReelLayout.Layout = [
      {
        id: "a",
        width: 1,
        panes: [pane("x", "X", 1), pane("y", "Y", 1), pane("z", "Z", 2)],
      },
    ];

    expect(ReelLayout.resizeOf(column, split("y"), 0.25)).toStrictEqual(
      Option.some(ResizedPanes({ columnId: "a", weights: { y: 2, z: 1 } }))
    );
    expect(ReelLayout.resizeOf(column, split("x"), -1)).toStrictEqual(
      Option.some(ResizedPanes({ columnId: "a", weights: { x: 0.2, y: 1.8 } }))
    );
  });

  it("never rounds a weight to nothing, however small the column or the panes beside a divider", () => {
    const tiny = [columnOfWeights([1e-4, 1e-4])];
    const thin = [columnOfWeights([1, 1e-10, 1e-10])];

    expect(ReelLayout.resizeOf(tiny, split("p0"), 0.25)).toStrictEqual(
      Option.some(
        ResizedPanes({ columnId: "a", weights: { p0: 0.00015, p1: 0.00005 } })
      )
    );
    expect(ReelLayout.resizeOf(tiny, split("p0"), -1)).toStrictEqual(
      Option.some(
        ResizedPanes({ columnId: "a", weights: { p0: 0.00001, p1: 0.00019 } })
      )
    );
    expect(ReelLayout.resizeOf(thin, split("p1"), 0.5)).toStrictEqual(
      Option.some(
        ResizedPanes({ columnId: "a", weights: { p1: 1e-10, p2: 1e-10 } })
      )
    );
    holds(
      Arbitrary.all([anyColumn, between(0, 4), between(-10_000, 10_000)]),
      ([weights, row, tenThousandths]) =>
        Option.match(
          ReelLayout.resizeOf(
            [columnOfWeights(weights)],
            split(`p${row}`),
            tenThousandths / 10_000
          ),
          {
            onNone: () => row >= weights.length - 1,
            onSome: (resize) =>
              resize._tag === "ResizedPanes" &&
              Array.every(Object.values(resize.weights), isWeight),
          }
        )
    );
  });

  it("asks nothing for a splitter whose column or panes are gone", () => {
    expect(ReelLayout.resizeOf(LAYOUT, width("gone"), 0.1)).toStrictEqual(
      Option.none()
    );
    expect(ReelLayout.resizeOf(LAYOUT, split("notes"), 0.1)).toStrictEqual(
      Option.none()
    );
    expect(ReelLayout.resizeOf(LAYOUT, split("gone"), 0.1)).toStrictEqual(
      Option.none()
    );
  });
});
