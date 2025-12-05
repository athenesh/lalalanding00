import { readFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import { parse } from "csv-parse/sync";
import { getServiceRoleClient } from "../lib/supabase/service-role";

// CSV 파일 경로
const SEED_DATA_DIR = join(process.cwd(), "supabase", "seed-data");

// ID 매핑 (외래키 관계 유지)
// key: CSV의 원본 ID, value: 생성된 UUID 또는 실제 DB ID
const idMapping: Record<string, string> = {};

// Clerk User ID → Account ID 매핑 (accounts 삽입 후 업데이트)
const clerkToAccountIdMapping: Record<string, string> = {};

// UUID 생성 헬퍼
function generateUUID(): string {
  return crypto.randomUUID();
}

// CSV 파일 읽기 및 파싱
function readCSV(filename: string): any[] {
  const filePath = join(SEED_DATA_DIR, filename);

  if (!existsSync(filePath)) {
    console.warn(`   ⚠️  File not found: ${filename}, skipping...`);
    return [];
  }

  console.log(`📖 Reading ${filename}...`);

  try {
    const content = readFileSync(filePath, "utf-8");
    const records = parse(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    console.log(`   ✓ Found ${records.length} records`);
    return records;
  } catch (error) {
    console.error(`   ❌ Error reading ${filename}:`, error);
    return [];
  }
}

// ID를 UUID로 변환하고 매핑 저장
function convertIdsToUUID(records: any[], idKey: string = "id"): any[] {
  return records.map((record) => {
    // ID가 없으면 생성
    if (record[idKey] && !idMapping[record[idKey]]) {
      idMapping[record[idKey]] = generateUUID();
    }

    const converted = { ...record };

    // ID 변환
    if (record[idKey] && idMapping[record[idKey]]) {
      converted[idKey] = idMapping[record[idKey]];
    }

    // 외래키 변환 (모든 _id로 끝나는 키)
    Object.keys(converted).forEach((key) => {
      if (key.endsWith("_id") && converted[key] && idMapping[converted[key]]) {
        converted[key] = idMapping[converted[key]];
      }
    });

    return converted;
  });
}

// 날짜 문자열을 ISO 형식으로 변환
function convertDate(dateStr: string | undefined): string | null {
  if (!dateStr || dateStr.trim() === "") return null;
  try {
    return new Date(dateStr).toISOString();
  } catch {
    return null;
  }
}

// 불린 값 변환
function convertBoolean(value: string | undefined): boolean | null {
  if (!value || value.trim() === "") return null;
  return value.toLowerCase() === "true";
}

// 숫자 변환
function convertNumber(value: string | undefined): number | null {
  if (!value || value.trim() === "") return null;
  const num = parseFloat(value);
  return isNaN(num) ? null : num;
}

// 레코드 정규화 (타입 변환)
function normalizeRecord(record: any, tableName: string): any {
  const normalized: any = {};

  for (const [key, value] of Object.entries(record)) {
    if (value === "" || value === null || value === undefined) {
      normalized[key] = null;
      continue;
    }

    // 날짜 필드 변환
    if (
      key.includes("_at") ||
      key.includes("date") ||
      key === "birth_date" ||
      key === "moving_date"
    ) {
      normalized[key] = convertDate(value as string);
    }
    // 불린 필드 변환
    else if (
      key.startsWith("is_") ||
      key === "has_pets" ||
      key === "has_washer_dryer" ||
      key === "parking" ||
      key === "school_district" ||
      key === "furnished"
    ) {
      normalized[key] = convertBoolean(value as string);
    }
    // 숫자 필드 변환
    else if (
      key.includes("price") ||
      key.includes("cost") ||
      key.includes("size") ||
      key === "bedrooms" ||
      key === "bathrooms" ||
      key === "age" ||
      key === "order_num" ||
      key === "budget_max"
    ) {
      normalized[key] = convertNumber(value as string);
    }
    // 문자열은 그대로
    else {
      normalized[key] = value;
    }
  }

  return normalized;
}

// 테이블에 데이터 삽입
async function insertData(
  supabase: any,
  tableName: string,
  records: any[],
  skipId: boolean = false,
): Promise<void> {
  if (records.length === 0) {
    console.log(`   ⚠️  No records to insert for ${tableName}`);
    return;
  }

  console.log(`📥 Inserting ${records.length} records into ${tableName}...`);

  // ID 컬럼 제거 (자동 생성되도록)
  const recordsToInsert = skipId
    ? records.map(({ id, ...rest }) => rest)
    : records;

  // 배치로 삽입 (Supabase는 한 번에 최대 1000개까지)
  const batchSize = 100;
  for (let i = 0; i < recordsToInsert.length; i += batchSize) {
    const batch = recordsToInsert.slice(i, i + batchSize);

    const { data, error } = await supabase
      .from(tableName)
      .insert(batch)
      .select();

    if (error) {
      console.error(`   ❌ Error inserting into ${tableName}:`, error.message);
      console.error(
        `   First record in batch:`,
        JSON.stringify(batch[0], null, 2),
      );
      throw error;
    }

    console.log(
      `   ✓ Inserted batch ${Math.floor(i / batchSize) + 1} (${
        batch.length
      } records)`,
    );

    // accounts 테이블인 경우 clerk_user_id → id 매핑 저장
    if (tableName === "accounts" && data) {
      data.forEach((inserted: any) => {
        if (inserted.clerk_user_id) {
          clerkToAccountIdMapping[inserted.clerk_user_id] = inserted.id;
        }
      });
    }
  }

  console.log(`   ✅ Successfully inserted all records into ${tableName}`);
}

// accounts 테이블의 clerk_user_id로 실제 id 조회
async function getAccountIdByClerkId(
  supabase: any,
  clerkUserId: string,
): Promise<string | null> {
  // 먼저 매핑에서 확인
  if (clerkToAccountIdMapping[clerkUserId]) {
    return clerkToAccountIdMapping[clerkUserId];
  }

  // DB에서 조회
  const { data, error } = await supabase
    .from("accounts")
    .select("id")
    .eq("clerk_user_id", clerkUserId)
    .single();

  if (error || !data) {
    console.warn(`   ⚠️  Account not found for clerk_user_id: ${clerkUserId}`);
    return null;
  }

  clerkToAccountIdMapping[clerkUserId] = data.id;
  return data.id;
}

// 메인 함수
async function main() {
  console.log("🚀 Starting seed data insertion...\n");

  // 디렉토리 확인 및 생성
  if (!existsSync(SEED_DATA_DIR)) {
    console.log(`📁 Creating seed data directory: ${SEED_DATA_DIR}`);
    mkdirSync(SEED_DATA_DIR, { recursive: true });
    console.log(`   ✓ Directory created\n`);
  }

  const supabase = getServiceRoleClient();

  try {
    // 1단계: 독립 테이블 (외래키 없음)
    console.log("📋 Step 1: Inserting independent tables...\n");

    // accounts 테이블
    const accounts = readCSV("accounts.csv");
    if (accounts.length > 0) {
      const accountsNormalized = accounts.map((acc) => {
        // accounts.csv 구조: clerk_user_id,email,name,role,created_at
        return {
          clerk_user_id: acc.clerk_user_id || acc[Object.keys(acc)[0]],
          email: acc.email || acc[Object.keys(acc)[1]],
          name: acc.name || acc[Object.keys(acc)[2]],
          role: acc.role || acc[Object.keys(acc)[3]],
          created_at: convertDate(acc.created_at || acc[Object.keys(acc)[4]]),
        };
      });
      await insertData(supabase, "accounts", accountsNormalized, true);
    }

    // users 테이블
    const users = readCSV("users.csv");
    if (users.length > 0) {
      const usersConverted = convertIdsToUUID(users);
      const usersNormalized = usersConverted.map((u) =>
        normalizeRecord(u, "users"),
      );
      await insertData(supabase, "users", usersNormalized);
    }

    // checklist_templates 테이블
    const templates = readCSV("checklist_templates.csv");
    if (templates.length > 0) {
      const templatesConverted = convertIdsToUUID(templates);
      const templatesNormalized = templatesConverted.map((t) =>
        normalizeRecord(t, "checklist_templates"),
      );
      await insertData(supabase, "checklist_templates", templatesNormalized);
    }

    console.log("\n");

    // 2단계: clients 테이블 (accounts 참조)
    console.log("📋 Step 2: Inserting clients table...\n");

    const clients = readCSV("clients.csv");
    if (clients.length > 0) {
      const clientsConverted = convertIdsToUUID(clients);

      // owner_agent_id를 accounts의 실제 id로 변환
      const clientsNormalized = await Promise.all(
        clientsConverted.map(async (client) => {
          const normalized = normalizeRecord(client, "clients");

          // owner_agent_id가 clerk_user_id인 경우 실제 account id로 변환
          if (normalized.owner_agent_id) {
            const accountId = await getAccountIdByClerkId(
              supabase,
              normalized.owner_agent_id,
            );
            if (accountId) {
              normalized.owner_agent_id = accountId;
              // ID 매핑도 업데이트 (다른 테이블에서 참조할 수 있도록)
              if (client.owner_agent_id && !idMapping[client.owner_agent_id]) {
                idMapping[client.owner_agent_id] = accountId;
              }
            } else {
              console.warn(
                `   ⚠️  Could not find account for owner_agent_id: ${normalized.owner_agent_id}`,
              );
            }
          }

          return normalized;
        }),
      );

      await insertData(supabase, "clients", clientsNormalized);
    }

    console.log("\n");

    // 3단계: clients를 참조하는 테이블들
    console.log("📋 Step 3: Inserting client-related tables...\n");

    // checklist_items
    const checklistItems = readCSV("checklist_items.csv");
    if (checklistItems.length > 0) {
      const checklistItemsConverted = convertIdsToUUID(checklistItems);
      const checklistItemsNormalized = checklistItemsConverted.map((item) =>
        normalizeRecord(item, "checklist_items"),
      );
      await insertData(supabase, "checklist_items", checklistItemsNormalized);
    }

    // agent_notes
    const agentNotes = readCSV("agent_notes.csv");
    if (agentNotes.length > 0) {
      const agentNotesConverted = convertIdsToUUID(agentNotes);
      // agent_id도 clerk_user_id일 수 있으므로 변환
      for (const note of agentNotesConverted) {
        if (note.agent_id && !idMapping[note.agent_id]) {
          const accountId = await getAccountIdByClerkId(
            supabase,
            note.agent_id,
          );
          if (accountId) {
            idMapping[note.agent_id] = accountId;
            note.agent_id = accountId;
          }
        } else if (note.agent_id && idMapping[note.agent_id]) {
          note.agent_id = idMapping[note.agent_id];
        }
      }
      const agentNotesNormalized = agentNotesConverted.map((note) =>
        normalizeRecord(note, "agent_notes"),
      );
      await insertData(supabase, "agent_notes", agentNotesNormalized);
    }

    // chat_rooms
    const chatRooms = readCSV("chat_rooms.csv");
    if (chatRooms.length > 0) {
      const chatRoomsConverted = convertIdsToUUID(chatRooms);
      const chatRoomsNormalized = chatRoomsConverted.map((room) =>
        normalizeRecord(room, "chat_rooms"),
      );
      await insertData(supabase, "chat_rooms", chatRoomsNormalized);
    }

    // client_documents
    const clientDocuments = readCSV("client_documents.csv");
    if (clientDocuments.length > 0) {
      const clientDocumentsConverted = convertIdsToUUID(clientDocuments);
      const clientDocumentsNormalized = clientDocumentsConverted.map((doc) =>
        normalizeRecord(doc, "client_documents"),
      );
      await insertData(supabase, "client_documents", clientDocumentsNormalized);
    }

    // emergency_contacts
    const emergencyContacts = readCSV("emergency_contacts.csv");
    if (emergencyContacts.length > 0) {
      const emergencyContactsConverted = convertIdsToUUID(emergencyContacts);
      const emergencyContactsNormalized = emergencyContactsConverted.map(
        (contact) => normalizeRecord(contact, "emergency_contacts"),
      );
      await insertData(
        supabase,
        "emergency_contacts",
        emergencyContactsNormalized,
      );
    }

    // family_members
    const familyMembers = readCSV("family_members.csv");
    if (familyMembers.length > 0) {
      const familyMembersConverted = convertIdsToUUID(familyMembers);
      const familyMembersNormalized = familyMembersConverted.map((member) =>
        normalizeRecord(member, "family_members"),
      );
      await insertData(supabase, "family_members", familyMembersNormalized);
    }

    // housing_requirements
    const housingRequirements = readCSV("housing_requirements.csv");
    if (housingRequirements.length > 0) {
      const housingRequirementsConverted =
        convertIdsToUUID(housingRequirements);
      const housingRequirementsNormalized = housingRequirementsConverted.map(
        (req) => normalizeRecord(req, "housing_requirements"),
      );
      await insertData(
        supabase,
        "housing_requirements",
        housingRequirementsNormalized,
      );
    }

    // messages (레거시)
    const messages = readCSV("messages.csv");
    if (messages.length > 0) {
      const messagesConverted = convertIdsToUUID(messages);
      const messagesNormalized = messagesConverted.map((msg) =>
        normalizeRecord(msg, "messages"),
      );
      await insertData(supabase, "messages", messagesNormalized);
    }

    console.log("\n");

    // 4단계: chat_rooms를 참조하는 테이블들
    console.log("📋 Step 4: Inserting chat room-related tables...\n");

    // chat_messages
    const chatMessages = readCSV("chat_messages.csv");
    if (chatMessages.length > 0) {
      const chatMessagesConverted = convertIdsToUUID(chatMessages);
      const chatMessagesNormalized = chatMessagesConverted.map((msg) =>
        normalizeRecord(msg, "chat_messages"),
      );
      await insertData(supabase, "chat_messages", chatMessagesNormalized);
    }

    // shared_listings
    const sharedListings = readCSV("shared_listings.csv");
    if (sharedListings.length > 0) {
      const sharedListingsConverted = convertIdsToUUID(sharedListings);
      const sharedListingsNormalized = sharedListingsConverted.map((listing) =>
        normalizeRecord(listing, "shared_listings"),
      );
      await insertData(supabase, "shared_listings", sharedListingsNormalized);
    }

    console.log("\n");
    console.log("✅ All seed data inserted successfully!");
    console.log(`📊 Total ID mappings: ${Object.keys(idMapping).length}`);
    console.log(
      `📊 Total Clerk→Account mappings: ${
        Object.keys(clerkToAccountIdMapping).length
      }`,
    );
  } catch (error) {
    console.error("❌ Error seeding data:", error);
    process.exit(1);
  }
}

// 스크립트 실행
main();
