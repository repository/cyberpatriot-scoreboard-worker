import parser from "@babel/parser";
import { ArrayExpression, ExpressionStatement, StringLiteral } from "@babel/types";
import cheerio from "cheerio";
import { parseRawDateTime, parseRawHistory, parseRawTime } from "./parsing";

export interface HistoryElement {
  time: Date;
  images: Record<string, number>;
}

class HTTPError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function getTeamInfo(team: string) {
  const url = new URL("http://scoreboard.uscyberpatriot.org/team.php");
  url.searchParams.set("team", team);

  const res = await fetch(url.toString());

  if (!res.ok) {
    throw new HTTPError(503, "Could not reach CyberPatriot scoreboard");
  }

  const html = await res.text();
  const $ = cheerio.load(html);

  const table = $("body > div:nth-child(2) > div > table:nth-child(8)");

  if (!table) {
    throw new HTTPError(404, "Team not found");
  }

  const rows = table.find("tr").toArray().slice(1);

  const images = rows.map((row) => ({
    name: $(row).find("td:nth-child(1)").text(),
    runtime: parseRawTime($(row).find("td:nth-child(2)").text()),
    issues: {
      found: parseInt($(row).find("td:nth-child(3)").text()),
      remaining: parseInt($(row).find("td:nth-child(4)").text()),
    },
    penalties: parseInt($(row).find("td:nth-child(5)").text()),
    score: parseInt($(row).find("td:nth-child(6)").text()),
    multiple: $(row).find("td:nth-child(7)").text().toUpperCase().includes("M"),
    overtime: $(row).find("td:nth-child(7)").text().toUpperCase().includes("T"),
  }));

  const script = $("body > div:nth-child(2) > div > script").text();

  const regex = /arrayToDataTable\(((?:.|\s)+?)\)/g;

  const matches = regex.exec(script);

  let history: HistoryElement[] = [];

  try {
    if (matches) {
      const parsed = parser.parse(matches[1]);

      const arrays = (parsed.program.body[0] as ExpressionStatement).expression as ArrayExpression;

      const data = arrays.elements.map((array) =>
        (array as ArrayExpression).elements.map((element) => (element as StringLiteral).value),
      );

      history = parseRawHistory(data);
    }
  } catch {}

  const updated = parseRawDateTime($("body > div:nth-child(2) > div > h2:nth-child(3)").text().substring(14, 33));

  return { images, history, updated };
}

export async function handleRequest(request: Request) {
  try {
    const url = new URL(request.url);

    const path = url.pathname.substring(1);

    if (path === "info") {
      const teams = url.searchParams.get("teams")?.split(",") ?? [];

      const data: Record<string, Awaited<ReturnType<typeof getTeamInfo>> | null> = Object.fromEntries(
        await Promise.all(teams.map(async (team) => [team, await getTeamInfo(team).catch(() => null)])),
      );

      return new Response(JSON.stringify(data), {
        headers: {
          "content-type": "application/json",
        },
      });
    }

    return new Response("Not found", {
      status: 404,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error instanceof HTTPError) {
        return new Response(error.message, {
          status: error.status,
          headers: {
            "access-control-allow-origin": "*",
          },
        });
      } else {
        return new Response("Internal Error: " + error.message, {
          status: 500,
        });
      }
    } else {
      return new Response("Internal Error", {
        status: 500,
      });
    }
  }
}

const setCors = (response: Response) => {
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Methods", "*");
  response.headers.set("Access-Control-Allow-Headers", "*");

  return response;
};

const worker: ExportedHandler<Bindings> = { fetch: async (request) => setCors(await handleRequest(request)) };
export default worker;
