import cheerio from 'cheerio';

const convertTime = (time: string) => {
  const [hours, minutes] = time.split(':').map(parseInt);
  return hours * 60 + minutes;
};

export async function handleRequest(request: Request, env: Bindings) {
  const team = new URL(request.url).pathname.substring(1);

  const url = new URL("http://scoreboard.uscyberpatriot.org/team.php");
  url.searchParams.set("team", team);

  const res = await fetch(url.toString());

  const html = await res.text();
  const $ = cheerio.load(html); 

  const table = $("body > div:nth-child(2) > div > table:nth-child(8)");

  // parse table, columns are image, time, found, remaning, penalties, score, flags
  const rows = table.find("tr").toArray().slice(1);
  
  const parsed = rows.map(row => ({
    name: $(row).find("td:nth-child(1)").text(),
    time: convertTime($(row).find("td:nth-child(2)").text()),
    issues: {
      found: parseInt($(row).find("td:nth-child(3)").text()),
      remaining: parseInt($(row).find("td:nth-child(4)").text()),
    },
    penalties: parseInt($(row).find("td:nth-child(5)").text()),
    score: parseInt($(row).find("td:nth-child(6)").text()),
    multiple: $(row).find("td:nth-child(7)").text().toUpperCase().includes("M"),
    overtime: $(row).find("td:nth-child(7)").text().toUpperCase().includes("T"),
  }))

  const script = $("body > div:nth-child(2) > div > script").text()

  return new Response(script, { status: 200 });
}

const worker: ExportedHandler<Bindings> = { fetch: handleRequest };

export default worker;
