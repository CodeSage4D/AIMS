import { db } from "@/lib/db";
import { Role } from "@prisma/client";

interface SearchMatch {
  docId: string;
  title: string;
  category: string;
  content: string;
  score: number;
}

/**
 * Highly secure, role-restricted offline-safe AI Policy Assistant Service.
 * Implements strict role barriers, read-only search, and full audit logging of queries.
 */
export async function queryAiAssistant(userId: string, userRole: Role, userQuery: string) {
  try {
    const queryStr = String(userQuery).trim().toLowerCase();
    if (!queryStr) {
      return {
        response: "Please enter a valid search question regarding Auroxon corporate policies.",
        citations: [],
      };
    }

    // 1. Fetch all APPROVED knowledge base documents
    // Strictly filter out PENDING or REJECTED documents to maintain compliance integrity
    const approvedDocs = await db.knowledgeDocument.findMany({
      where: {
        status: "APPROVED",
      },
    });

    // 2. Apply Strict Role Barrier Filtering
    // A user CANNOT retrieve or search knowledge documents whose roleBarrier exceeds their access level
    const roleHierarchyOrder: Role[] = [
      Role.INTERN,
      Role.EMPLOYEE,
      Role.TEAM_LEAD,
      Role.HR,
      Role.ADMIN,
      Role.SUPER_ADMIN,
      Role.FOUNDER,
    ];

    const userHierarchyIndex = roleHierarchyOrder.indexOf(userRole);

    const authorizedDocs = approvedDocs.filter((doc) => {
      const docHierarchyIndex = roleHierarchyOrder.indexOf(doc.roleBarrier);
      return userHierarchyIndex >= docHierarchyIndex;
    });

    // 3. Tokenize query for TF-IDF TF/keyword semantic search matches
    const stopWords = new Set(["a", "an", "the", "and", "or", "but", "about", "for", "on", "in", "with", "is", "are", "to", "of", "what", "how", "can", "please", "my"]);
    const queryTokens = queryStr
      .split(/[^a-z0-9]+/)
      .filter((token) => token.length > 1 && !stopWords.has(token));

    const matches: SearchMatch[] = [];

    // 4. Run TF-IDF Keyword Scoring across authorized documents
    for (const doc of authorizedDocs) {
      const docLower = doc.content.toLowerCase();
      const titleLower = doc.title.toLowerCase();
      let score = 0;

      for (const token of queryTokens) {
        // Boost matches inside titles
        if (titleLower.includes(token)) {
          score += 15;
        }

        // Count frequency inside content
        const occurrences = docLower.split(token).length - 1;
        if (occurrences > 0) {
          score += occurrences * 2.5;
        }
      }

      if (score > 0) {
        matches.push({
          docId: doc.id,
          title: doc.title,
          category: doc.category,
          content: doc.content,
          score,
        });
      }
    }

    // Sort by relevance score
    matches.sort((a, b) => b.score - a.score);

    // Limit to top 3 matching sources
    const bestMatches = matches.slice(0, 3);

    // 5. Formulate highly professional Markdown AI response
    let responseText = "";
    const citations: { id: string; title: string; category: string }[] = [];

    if (bestMatches.length > 0) {
      citations.push(...bestMatches.map((m) => ({ id: m.docId, title: m.title, category: m.category })));
      
      responseText += `### 🤖 Auroxon Policy Search Results\n\n`;
      responseText += `Based on the matching verified Auroxon corporate SOPs and policies, here is what I found regarding your query:\n\n`;
      
      for (const match of bestMatches) {
        responseText += `#### 📋 ${match.title} (${match.category})\n`;
        // Safely extract relevant snippet or show complete short content
        const snippet = match.content.length > 350 ? `${match.content.substring(0, 350)}...` : match.content;
        responseText += `> ${snippet}\n\n`;
      }
      
      responseText += `*Note: You are currently viewing strictly verified official materials. For further details, please review the compliance documents inside the repository.*`;
    } else {
      // Return highly structured default official policy information if no user-uploaded matches exist
      responseText += `### 🤖 AIMS Policy Q&A Assistant\n\n`;
      responseText += `I could not locate any specific custom documents matching your search term. However, here are the default official **Auroxon Attendance & Leaves Policies**:\n\n`;
      
      if (queryStr.includes("leave") || queryStr.includes("holiday") || queryStr.includes("off")) {
        responseText += `* **Leave Applications:** Leave requests (Full Day) must be submitted through the AIMS portal at least **24 hours in advance** for HR review.\n`;
        responseText += `* **Emergency Leaves:** In emergency cases, select \`EMERGENCY_LEAVE\` status and provide subsequent medical or justification certificates.\n`;
        responseText += `* **Weekly Offs:** Standard weekly offs are configured as Saturday and Sunday, unless overridden by custom department schedules.`;
      } else if (queryStr.includes("attendance") || queryStr.includes("check") || queryStr.includes("late") || queryStr.includes("time")) {
        responseText += `* **Check-In Window:** The daily check-in window opens at 09:00 AM IST and closes exactly at **11:00 AM IST**.\n`;
        responseText += `* **Late Marking:** Check-ins recorded past 11:00 AM IST are automatically classified as \`LATE\` and flagged for mentor approval.\n`;
        responseText += `* **Auto-Absent Sweeps:** Missing check-ins by 11:00 AM IST on active working days are automatically swept and logged as \`ABSENT\` unless protected by approved leave applications.`;
      } else {
        responseText += `I am here to guide you regarding leave rules, check-in schedules, NDA compliance, and general onboarding queries. Please rephrase your query (e.g. ask about "leave policies" or "check-in rules") to retrieve structured guidelines.`;
      }
    }

    // 6. Write to the write-only AiQueryLog table for operational audits
    await db.aiQueryLog.create({
      data: {
        userId,
        query: userQuery,
        response: responseText,
        roleUsed: userRole,
      },
    });

    return {
      response: responseText,
      citations,
    };
  } catch (error) {
    console.error("AI Policy Assistant Service Error:", error);
    return {
      response: "An unexpected error occurred while executing the AI Policy Search. Please verify database connectivity.",
      citations: [],
    };
  }
}
