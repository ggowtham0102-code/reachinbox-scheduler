import { Client } from "@elastic/elasticsearch";
import { env } from "../config/env";
import { prisma } from "../db/prisma";

const INDEX = "emails";

const client = env.elasticsearchUrl
  ? new Client({ node: env.elasticsearchUrl })
  : null;

let warnedOnce = false;
function warnDisabled() {
  if (!warnedOnce) {
    // eslint-disable-next-line no-console
    console.warn(
      "[elasticsearch] ELASTICSEARCH_URL not set — search will fall back to Postgres ILIKE."
    );
    warnedOnce = true;
  }
}

export async function ensureIndex(): Promise<void> {
  if (!client) return warnDisabled();
  const exists = await client.indices.exists({ index: INDEX });
  if (!exists) {
    await client.indices.create({
      index: INDEX,
      mappings: {
        properties: {
          subject: { type: "text" },
          body: { type: "text" },
          toEmail: { type: "keyword" },
          senderEmail: { type: "keyword" },
          status: { type: "keyword" },
          sentAt: { type: "date" },
          scheduledAt: { type: "date" },
        },
      },
    });
  }
}

export async function indexEmailJob(job: {
  id: string;
  subject: string;
  body: string;
  toEmail: string;
  senderEmail: string;
  status: string;
  sentAt: Date | null;
  scheduledAt: Date;
}): Promise<void> {
  if (!client) return warnDisabled();
  try {
    await client.index({
      index: INDEX,
      id: job.id,
      document: job,
      refresh: "wait_for",
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[elasticsearch] indexing failed:", err);
  }
}

export async function searchEmails(query: string) {
  if (client) {
    try {
      const result = await client.search({
        index: INDEX,
        query: {
          multi_match: {
            query,
            fields: ["subject", "body", "toEmail"],
          },
        },
      });
      return result.hits.hits.map((h) => h._source);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[elasticsearch] search failed, falling back to Postgres:", err);
    }
  }

  // Fallback: Postgres ILIKE across subject/body/toEmail.
  return prisma.emailJob.findMany({
    where: {
      OR: [
        { subject: { contains: query } },
        { body: { contains: query } },
        { toEmail: { contains: query } },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}
