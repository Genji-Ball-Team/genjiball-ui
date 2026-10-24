import { afterEach, expect, test } from "vitest";
import { GbLeaderboard } from "../src/leaderboard.js";

function make(): GbLeaderboard {
  const element = document.createElement("gb-leaderboard") as GbLeaderboard;
  element.innerHTML = `<table>
    <thead><tr><th>Place</th><th>Player</th><th>Tier</th><th>Rating</th><th>Change</th></tr></thead>
    <tbody>
      <tr data-tier="sovereign" data-title="god"><td>1</td><td><a href="#">Kyoryu</a></td><td></td><td>2,871</td><td></td></tr>
      <tr data-tier="champion"><td>2</td><td><span>Shimada</span></td><td></td><td>2,604</td><td></td></tr>
    </tbody>
  </table>`;
  document.body.append(element);
  return element;
}

const roles = (element: Element, selector: string) =>
  [...element.querySelectorAll(selector)].map((part) => part.getAttribute("role"));

afterEach(() => {
  document.body.replaceChildren();
});

test("gives the table, its rows and cells their roles back", () => {
  const element = make();
  expect(roles(element, "table")).toEqual(["table"]);
  expect(roles(element, "thead, tbody")).toEqual(["rowgroup", "rowgroup"]);
  expect(roles(element, "tr")).toEqual(["row", "row", "row"]);
  expect(new Set(roles(element, "th"))).toEqual(new Set(["columnheader"]));
  expect(new Set(roles(element, "td"))).toEqual(new Set(["cell"]));
});

test("rows added later get their roles too", async () => {
  const element = make();
  const added = document.createElement("tr");
  added.append(document.createElement("td"), document.createElement("td"));
  element.querySelector("tbody")?.append(added);
  await new Promise((resolve) => setTimeout(resolve));
  const row = element.querySelectorAll("tbody > tr")[2];
  expect(row?.getAttribute("role")).toBe("row");
  expect(roles(row ?? element, "td")).toEqual(["cell", "cell"]);
});

test("styles are in the document once, for every tier and both titles", () => {
  make();
  make();
  const sheets = document.adoptedStyleSheets.filter((sheet) =>
    [...sheet.cssRules].some((rule) => rule.cssText.includes("gb-leaderboard")),
  );
  expect(sheets).toHaveLength(1);
  const css = [...(sheets[0]?.cssRules ?? [])].map((rule) => rule.cssText).join("\n");
  for (const tier of ["rookie", "sovereign"]) expect(css).toContain(`--t-${tier}`);
  expect(css).toContain('data-title="god"');
  expect(css).toContain('data-title="demigod"');
});
