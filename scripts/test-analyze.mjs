import fs from "fs";

const png = fs.readFileSync(new URL("../public/sample-report.png", import.meta.url));
const b64 = png.toString("base64");

const body = {
  image: `data:image/png;base64,${b64}`,
  language: process.argv[2] === "hi" ? "hi" : "en",
  patientContext: "54, type-2 diabetes, currently on Metformin and Telmisartan",
};

const res = await fetch("http://localhost:3000/api/analyze", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

const data = await res.json();
console.log("HTTP", res.status);
console.log(JSON.stringify(data, null, 2));
