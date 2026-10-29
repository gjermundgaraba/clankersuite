import {
  Button,
  Card,
  CodeSurface,
  Disclosure,
  Focus,
  Identity,
  Notice,
  Outcome,
  PropsList,
  Tag,
  Wall,
} from "@gjermundgaraba/pixel-paper";
import { Option, Schema } from "effect";
import type { Html, HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";
import { modifyFields } from "foldkit/struct";
import { defineView } from "foldkit/submodel";
import type * as Update from "foldkit/update";

import type { CopyView } from "../copies.ts";
import { ASKING } from "../sample.ts";
import { brandView } from "../spec.ts";

const Answer = Schema.Literals(["Allowed", "Denied"]);

export const Model = Schema.Struct({
  maybeAnswer: Schema.Option(Answer),
  isClaimsOpen: Schema.Boolean,
});

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({
  ClickedAllow: {},
  ClickedDeny: {},
  ClickedAskAgain: {},
  ToggledClaims: { isOpen: Schema.Boolean },
  CompletedFocus: {},
});

export type Message = typeof Message.Type;

export const init = (): Model => ({
  maybeAnswer: Option.none(),
  isClaimsOpen: false,
});

const ALLOW_ID = "consent-allow";
const ASK_AGAIN_ID = "consent-ask-again";

export const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    ClickedAllow: () => ({
      model: modifyFields(model, {
        maybeAnswer: () => Option.some("Allowed" as const),
      }),
      commands: [Focus.Focus({ id: ASK_AGAIN_ID })],
    }),
    ClickedDeny: () => ({
      model: modifyFields(model, {
        maybeAnswer: () => Option.some("Denied" as const),
      }),
      commands: [Focus.Focus({ id: ASK_AGAIN_ID })],
    }),
    ClickedAskAgain: () => ({
      model: modifyFields(model, { maybeAnswer: () => Option.none() }),
      commands: [Focus.Focus({ id: ALLOW_ID })],
    }),
    ToggledClaims: ({ isOpen }) => ({
      model: modifyFields(model, { isClaimsOpen: () => isOpen }),
    }),
    CompletedFocus: () => ({ model }),
  });

export type ViewInputs = Readonly<{ toCopyView: CopyView }>;

const answeredView = (isAllowed: boolean, h: HtmlBuilder<Message>): Html =>
  Card.view(
    {
      title: "Access",
      meta: isAllowed ? "allowed" : "denied",
      isNarrow: true,
      actions: [
        Button.view(
          {
            label: "ask again",
            onClick: Message.ClickedAskAgain(),
            attributes: [h.Id(ASK_AGAIN_ID)],
          },
          h
        ),
      ],
      body: [
        isAllowed
          ? Outcome.view(
              {
                tone: "Ok",
                title: "Access allowed",
                body: [
                  `Returning you to ${ASKING.name}. You can take it back from the console at any time.`,
                ],
              },
              h
            )
          : Outcome.view(
              {
                tone: "Quiet",
                title: "Access denied",
                body: [`${ASKING.name} was told no, and was given nothing.`],
              },
              h
            ),
      ],
    },
    h
  );

const clientView = (h: HtmlBuilder<Message>): readonly Html[] => [
  Identity.view(
    {
      label: ASKING.name,
      isLarge: true,
      meta: [h.code([], [ASKING.id]), " ", Tag.view({ label: ASKING.kind }, h)],
    },
    h
  ),
  h.p(
    [],
    [
      `${ASKING.name} wants to act as you on `,
      h.code([], [ASKING.resource]),
      ". It asks to:",
    ]
  ),
  PropsList.view(
    {
      items: ASKING.scopes.map(({ scope, what }) => ({
        label: scope,
        value: [what],
      })),
    },
    h
  ),
];

const addressesView = (toCopyView: CopyView, h: HtmlBuilder<Message>): Html =>
  PropsList.view(
    {
      items: [
        {
          label: "returns to",
          value: [ASKING.returnTo],
          isCode: true,
          actions: [
            toCopyView("consent-return", {
              text: ASKING.returnTo,
              label: "Copy returns to",
            }),
          ],
        },
        {
          label: "resource",
          value: [ASKING.resource],
          isCode: true,
          actions: [
            toCopyView("consent-resource", {
              text: ASKING.resource,
              label: "Copy resource",
            }),
          ],
        },
      ],
    },
    h
  );

const claimsView = (model: Model, h: HtmlBuilder<Message>): Html =>
  Disclosure.view(
    {
      id: "consent-claims",
      label: "claims it asked for",
      isOpen: model.isClaimsOpen,
      onToggle: (isOpen) => Message.ToggledClaims({ isOpen }),
      body: [
        CodeSurface.view(
          { label: "Requested claims", body: [ASKING.claims] },
          h
        ),
      ],
    },
    h
  );

const askingView = (
  model: Model,
  toCopyView: CopyView,
  h: HtmlBuilder<Message>
): Html =>
  Card.view(
    {
      title: "Allow access",
      meta: "sample client",
      lead: [h.span([h.Class("note-line")], ["Signed in as the owner."])],
      actions: [
        Button.view({ label: "deny", onClick: Message.ClickedDeny() }, h),
        Button.view(
          {
            label: "allow",
            variant: "Primary",
            isDefault: true,
            onClick: Message.ClickedAllow(),
            attributes: [h.Id(ALLOW_ID)],
          },
          h
        ),
      ],
      body: [
        Wall.markView({ brand: brandView(h) }, h),
        ...clientView(h),
        addressesView(toCopyView, h),
        claimsView(model, h),
        Notice.view(
          {
            tone: "Quiet",
            body: [
              "Sample consent: nothing is granted and nobody is sent anywhere.",
            ],
          },
          h
        ),
      ],
    },
    h
  );

export const view = defineView<Model, Message, ViewInputs>(
  (model, { toCopyView }, h): Html =>
    Option.match(model.maybeAnswer, {
      onNone: () => askingView(model, toCopyView, h),
      onSome: (answer) => answeredView(answer === "Allowed", h),
    })
);
