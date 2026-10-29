import { CodeSurface, Wordmark } from "@gjermundgaraba/pixel-paper";
import { Array } from "effect";
import type { Html, HtmlBuilder } from "foldkit/html";

import { SAMPLE_LINE } from "./sample.ts";
import { shownAttribute } from "./shown.ts";

export type SectionConfig = Readonly<{
  id: string;
  title: string;
  meta?: string;
  about?: string | undefined;
  covers?: readonly string[] | undefined;
  body: readonly Html[];
  foot?: readonly Html[];
}>;

export const sectionView = <Message>(
  config: SectionConfig,
  h: HtmlBuilder<Message>
): Html => {
  const { id, title, meta, about, covers = [], body, foot = [] } = config;
  const headingId = `${id}-heading`;

  return h.keyed("section")(
    id,
    [h.Class("spec-section"), h.Id(id), h.AriaLabelledBy(headingId)],
    [
      h.header(
        [h.Class("spec-head")],
        [
          h.h2([h.Id(headingId)], [title]),
          ...(meta === undefined
            ? []
            : [h.span([h.Class("spec-meta")], [meta])]),
          ...Array.match(covers, {
            onEmpty: () => [],
            onNonEmpty: (names) => [
              h.p(
                [h.Class("spec-names")],
                Array.map(names, (name) => h.keyed("code")(name, [], [name]))
              ),
            ],
          }),
          ...(about === undefined
            ? []
            : [h.p([h.Class("spec-about")], [about])]),
        ]
      ),
      h.div([h.Class("spec-body"), shownAttribute(h)], body),
      ...Array.match(foot, {
        onEmpty: () => [],
        onNonEmpty: (children) => [h.div([h.Class("spec-foot")], children)],
      }),
    ]
  );
};

export const specView = <Message>(
  label: string,
  children: ReadonlyArray<Html | string>,
  h: HtmlBuilder<Message>
): Html =>
  h.div(
    [h.Class("spec-item")],
    [h.span([h.Class("spec-caption")], [label]), ...children]
  );

export const wideSpecView = <Message>(
  label: string,
  children: ReadonlyArray<Html | string>,
  h: HtmlBuilder<Message>
): Html =>
  h.div(
    [h.Class("spec-item wide")],
    [h.span([h.Class("spec-caption")], [label]), ...children]
  );

export const rowView = <Message>(
  children: readonly Html[],
  h: HtmlBuilder<Message>
): Html => h.div([h.Class("spec-row")], children);

export const sourceView = <Message>(
  file: string,
  source: string,
  h: HtmlBuilder<Message>
): Html =>
  h.div(
    [h.Class("spec-code")],
    [
      h.div(
        [h.Class("spec-code-head")],
        [h.span([h.Class("spec-caption")], [file])]
      ),
      CodeSurface.view({ label: `${file}, the source`, body: [source] }, h),
    ]
  );

export const brandView = <Message>(
  h: HtmlBuilder<Message>
): readonly Html[] => [Wordmark.view({ label: "pixel paper" }, h)];

export const sampleLineView = <Message>(h: HtmlBuilder<Message>): Html =>
  h.p([h.Class("spec-caption sample-line")], [SAMPLE_LINE]);
