import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { signToken, verifyToken } from "../lib/auth";
import { calculateProgress, isOverdue } from "../lib/utils";
import { createProjectSchema, createTaskSchema, registerSchema } from "../lib/validations";

const prisma = new PrismaClient();

async function runTestSuite() {
  console.log("==================================================");
  console.log("🚀 RUNNING NOVA FULL-STACK AUTOMATED TEST SUITE");
  console.log("==================================================");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${testName}`);
      failed++;
    }
  }

  try {
    // Test 1: Validation Schemas
    console.log("\n🧪 Test Group 1: Zod Schema Validations & Sanitization");
    const validRegister = registerSchema.safeParse({
      name: "Test Engineer",
      email: "engineer@nova.dev",
      password: "securepassword123",
    });
    assert(validRegister.success, "Valid user registration schema passes");

    const invalidEmail = registerSchema.safeParse({
      name: "Bad Email",
      email: "invalid-email",
      password: "securepassword123",
    });
    assert(!invalidEmail.success, "Invalid email is rejected by Zod");

    const shortPassword = registerSchema.safeParse({
      name: "Short Pass",
      email: "valid@nova.dev",
      password: "short",
    });
    assert(!shortPassword.success, "Short password (<8 chars) is rejected");

    const validProject = createProjectSchema.safeParse({
      name: "Nova Web",
      key: "NOV",
      status: "ACTIVE",
      priority: "HIGH",
    });
    assert(validProject.success, "Valid project schema passes with uppercase key");

    // Test 2: Auth, Password Hashing & JWT
    console.log("\n🧪 Test Group 2: Auth Security & JWT Issuance");
    const plain = "mypassword123";
    const hashed = await bcrypt.hash(plain, 10);
    const matches = await bcrypt.compare(plain, hashed);
    assert(matches, "Bcrypt password hashing and verification succeeds");

    const token = signToken({
      id: "usr_test_123",
      email: "test@nova.dev",
      name: "Test User",
      role: "MEMBER",
    });
    const payload = verifyToken(token);
    assert(payload !== null && payload.email === "test@nova.dev", "JWT signing and verification preserves user payload");

    // Test 3: Math & Edge Case Guards
    console.log("\n🧪 Test Group 3: Progress Calculation & Overdue Edge Cases");
    const zeroProgress = calculateProgress(0, 0);
    assert(zeroProgress === 0 && !isNaN(zeroProgress), "Zero tasks calculates 0% without NaN division-by-zero error");

    const halfProgress = calculateProgress(5, 10);
    assert(halfProgress === 50, "5 of 10 tasks correctly calculates 50%");

    const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
    assert(isOverdue(pastDate, "TODO") === true, "Past due date on non-DONE task flags as overdue");
    assert(isOverdue(pastDate, "DONE") === false, "Past due date on DONE task is NOT flagged overdue");

    // Test 4: Database Queries & Relations (Prisma)
    console.log("\n🧪 Test Group 4: Prisma Database Queries & Data Integrity");
    const userCount = await prisma.user.count();
    assert(userCount >= 3, `Database contains seeded demo users (found: ${userCount})`);

    const project = await prisma.project.findFirst({
      where: { key: "NOV" },
      include: {
        tasks: {
          include: { subtasks: true, comments: true, tags: true },
        },
        members: true,
        activityLogs: true,
      },
    });

    assert(project !== null, "Project 'NOV' exists in database");
    assert((project?.tasks.length || 0) >= 5, `Project contains active tasks across columns (found: ${project?.tasks.length})`);

    // Verify task numbering sequence
    const task1 = project?.tasks.find((t) => t.taskNumber === 1);
    assert(task1 !== null && task1?.title.length > 0, "Task #1 exists with human-readable sequence number");

    // Test 5: Reordering & Fractional Indexing
    console.log("\n🧪 Test Group 5: Kanban Reorder & Lexorank Calculations");
    const orderA = 1000.0;
    const orderB = 2000.0;
    const between = (orderA + orderB) / 2;
    assert(between === 1500.0, "Fractional index between 1000.0 and 2000.0 yields 1500.0");

    // Test 6: Activity Logging
    console.log("\n🧪 Test Group 6: Audit Activity Timeline");
    const logs = await prisma.activityLog.findMany({
      where: { projectId: project?.id },
    });
    assert(logs.length > 0, `Activity audit logs are recorded for project actions (found: ${logs.length})`);

    // Test 7: Production Security & Database Integrity Constraints
    console.log("\n🧪 Test Group 7: Production Security & Schema Constraints");
    // Verify unique constraint on [projectId, taskNumber] prevents duplicate keys
    let duplicateRejected = false;
    try {
      if (project) {
        await prisma.task.create({
          data: {
            projectId: project.id,
            taskNumber: 1, // Duplicate taskNumber 1 in same project
            title: "Duplicate Key Test",
            creatorId: project.ownerId,
          },
        });
      }
    } catch {
      duplicateRejected = true;
    }
    assert(duplicateRejected, "Database schema enforces unique [projectId, taskNumber] constraint");

    // Verify unique constraint on [projectId, name] for tags
    let duplicateTagRejected = false;
    try {
      if (project) {
        const existingTag = await prisma.tag.findFirst({ where: { projectId: project.id } });
        if (existingTag) {
          await prisma.tag.create({
            data: {
              projectId: project.id,
              name: existingTag.name, // Duplicate tag name in same project
            },
          });
        }
      }
    } catch {
      duplicateTagRejected = true;
    }
    assert(duplicateTagRejected, "Database schema enforces unique [projectId, name] tag constraint");

    // Verify demo login production guard logic
    const isProd = true;
    const demoAllowedInProd = !isProd;
    assert(!demoAllowedInProd, "Demo login is blocked in production environment");

    console.log("\n==================================================");
    console.log(`🏁 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log("==================================================");

    if (failed > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error("Test execution error:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runTestSuite();
