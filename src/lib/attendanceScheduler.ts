import { db } from "./db";

/**
 * Automatically sweeps through recent active intern schedules and commits ABSENT records
 * for missing check-in days, respecting joining dates, weekends, and approved leave calendars.
 */
export async function autoMarkAbsent() {
  try {
    // 1. Fetch all active interns
    const activeInterns = await db.intern.findMany({
      where: {
        status: "ACTIVE",
      },
      select: {
        id: true,
        startDate: true,
      },
    });

    if (activeInterns.length === 0) return { success: true, count: 0 };

    // 2. Resolve current date & Indian Standard Time (IST = UTC + 5.5 Hours)
    const nowUTC = new Date();
    const offsetIST = 5.5 * 60 * 60 * 1000;
    const nowIST = new Date(nowUTC.getTime() + offsetIST);
    
    // Check if the current hour in IST is past the 11:00 AM check-in deadline
    const currentHourIST = nowIST.getUTCHours(); // getUTCHours of this shifted date yields the IST hour
    
    // Dates to audit: Check the last 7 calendar days
    // Index 0 represents today. If it's before 11:00 AM IST, skip today (start from yesterday, index 1)
    const datesToCheck: Date[] = [];
    const startIdx = currentHourIST >= 11 ? 0 : 1;

    for (let i = startIdx; i <= 7; i++) {
      const d = new Date(nowIST.getTime());
      d.setUTCDate(d.getUTCDate() - i);
      
      const dayOfWeek = d.getUTCDay();
      // Exclude weekends (Saturday = 6, Sunday = 0)
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        continue;
      }

      // Normalize date to absolute midnight UTC to fit database constraints
      const normalizedDate = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
      datesToCheck.push(normalizedDate);
    }

    if (datesToCheck.length === 0) return { success: true, count: 0 };

    const internIds = activeInterns.map((i) => i.id);

    // 3. Query existing attendance records for the scope to avoid overwriting or duplicates
    const existingAttendance = await db.attendance.findMany({
      where: {
        internId: { in: internIds },
        date: { in: datesToCheck },
      },
      select: {
        internId: true,
        date: true,
      },
    });

    // Create a lookup key hashmap
    const existingKeys = new Set(
      existingAttendance.map((r) => `${r.internId}_${r.date.toISOString()}`)
    );

    // 4. Query all approved leaves for active interns
    const approvedLeaves = await db.leaveApplication.findMany({
      where: {
        internId: { in: internIds },
        status: "APPROVED",
      },
      select: {
        internId: true,
        startDate: true,
        endDate: true,
      },
    });

    // Helper to evaluate if a target date is protected by an approved leave application
    const isInternOnApprovedLeave = (internId: string, targetDate: Date) => {
      return approvedLeaves.some((l) => {
        if (l.internId !== internId) return false;
        
        const start = new Date(l.startDate);
        start.setUTCHours(0, 0, 0, 0);
        
        const end = new Date(l.endDate);
        end.setUTCHours(23, 59, 59, 999);
        
        return targetDate >= start && targetDate <= end;
      });
    };

    // 5. Build list of absent records to create
    const absentsToCreate: {
      internId: string;
      date: Date;
      status: "ABSENT";
      remarks: string;
    }[] = [];

    for (const intern of activeInterns) {
      const internStartDate = new Date(intern.startDate);
      internStartDate.setUTCHours(0, 0, 0, 0);

      for (const date of datesToCheck) {
        // Safety check A: Must not mark absent before their official starting date
        if (date < internStartDate) {
          continue;
        }

        const lookupKey = `${intern.id}_${date.toISOString()}`;
        
        // Safety check B: Must not overwrite pre-existing records (Present, Late, Leave)
        if (existingKeys.has(lookupKey)) {
          continue;
        }

        // Safety check C: Must not mark absent if on an approved leave application
        if (isInternOnApprovedLeave(intern.id, date)) {
          continue;
        }

        absentsToCreate.push({
          internId: intern.id,
          date: date,
          status: "ABSENT",
          remarks: "Auto-marked Absent: Missed daily check-in window.",
        });
      }
    }

    if (absentsToCreate.length === 0) {
      return { success: true, count: 0 };
    }

    // 6. Batch write missing records using Prisma's createMany
    const result = await db.attendance.createMany({
      data: absentsToCreate,
      skipDuplicates: true,
    });

    if (result.count > 0) {
      console.log(`[Auto-Absent Scheduler] Successfully logged ${result.count} absent entries.`);
    }

    return { success: true, count: result.count };
  } catch (error) {
    console.error("[Auto-Absent Scheduler Error]:", error);
    return { success: false, error };
  }
}
