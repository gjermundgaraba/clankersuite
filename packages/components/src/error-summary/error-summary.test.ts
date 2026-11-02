import { Scene } from "foldkit";
import type { HtmlBuilder } from "foldkit/html";
import { describe, it } from "vite-plus/test";

import * as ErrorSummary from "./error-summary.ts";

type Model = Readonly<{ errors: readonly ErrorSummary.FieldError[] }>;

const update = (model: Model, _message: never) => ({ model });

const view = (model: Model, h: HtmlBuilder<never>) =>
  h.form(
    [],
    [ErrorSummary.view({ id: "form-errors", errors: model.errors }, h)]
  );

describe("ErrorSummary", () => {
  it("heads its links to the failed fields with how many need attention", () => {
    Scene.scene(
      { update, view },
      Scene.given<Model>({
        errors: [
          { id: "owner", message: "Enter the owner name." },
          { id: "due", message: "Pick a date after today." },
        ],
      }),
      Scene.expect(Scene.selector("#form-errors")).toHaveClass("error-summary"),
      Scene.expect(Scene.selector("#form-errors")).toHaveAttr("tabIndex", "-1"),
      Scene.expect(Scene.selector("#form-errors")).not.toHaveAttr("role"),
      Scene.expect(Scene.selector("#form-errors strong")).toHaveText(
        "2 fields need attention"
      ),
      Scene.expect(
        Scene.role("link", { name: "Enter the owner name." })
      ).toHaveAttr("href", "#owner")
    );
    Scene.scene(
      { update, view },
      Scene.given<Model>({
        errors: [{ id: "owner", message: "Enter the owner name." }],
      }),
      Scene.expect(Scene.selector("#form-errors strong")).toHaveText(
        "1 field needs attention"
      )
    );
  });

  it("renders nothing with no errors", () => {
    Scene.scene(
      { update, view },
      Scene.given<Model>({ errors: [] }),
      Scene.expect(Scene.selector("#form-errors")).toBeAbsent()
    );
  });
});
