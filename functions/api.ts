import serverless from "serverless-http";
import app from "../src/api.ts";

export const handler = serverless(app);
