// Local definition to avoid import issues
export enum SchemaType {
  STRING = "STRING",
  NUMBER = "NUMBER",
  INTEGER = "INTEGER",
  BOOLEAN = "BOOLEAN",
  ARRAY = "ARRAY",
  OBJECT = "OBJECT",
}

export function buildResponseSchema(
  responseMode: string | undefined | null,
  schemaStr: string | undefined | null
): any {
  // Default to free text if not specified
  const mode = responseMode || "free";
  const schemaType = schemaStr || (mode === "structured" ? "text" : "");

  // Common sources schema
  const sourcesSchema = {
    type: SchemaType.ARRAY,
    items: {
      type: SchemaType.OBJECT,
      properties: {
        url: { type: SchemaType.STRING },
        title: { type: SchemaType.STRING, nullable: true },
        snippet: { type: SchemaType.STRING, nullable: true },
      },
      required: ["url"],
    },
    nullable: true,
  };

  // Base structure
  const baseProperties: any = {
    confidence: { type: SchemaType.NUMBER, nullable: true },
    sources: sourcesSchema,
  };

  // Determine value schema
  let valueSchema: any = { type: SchemaType.STRING }; // Default

  if (mode === "structured") {
    if (schemaType === "number") {
      valueSchema = { type: SchemaType.NUMBER };
    } else if (schemaType.startsWith("enum(") && schemaType.endsWith(")")) {
      const content = schemaType.slice(5, -1);
      const options = content.split(",").map((s) => s.trim());
      valueSchema = { type: SchemaType.STRING, enum: options };
    }
    // else "text" -> string
  }

  baseProperties.value = valueSchema;

  return {
    type: SchemaType.OBJECT,
    properties: baseProperties,
    required: ["value"],
  };
}
