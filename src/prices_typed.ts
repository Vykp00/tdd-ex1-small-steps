import "./polyfills";
import express from "express";
import { Database } from "./database";
import { Temporal } from "@js-temporal/polyfill";

// Refactor the following code to get rid of the legacy Date class.
// Use Temporal.PlainDate instead. See /test/date_conversion.spec.mjs for examples.

function createApp(database: Database) {
  const app = express();

  app.put("/prices", (req, res) => {
    const type = req.query.type as string;
    const cost = parseInt(req.query.cost as string);
    database.setBasePrice(type, cost);
    res.json();
  });

  app.get("/prices", (req, res) => {
    const age = req.query.age ? parseInt(req.query.age as string) : undefined;
    const type = req.query.type as string;
    const baseCost = database.findBasePriceByType(type)!.cost;
    const date = parseDate(req.query.date as string);
    const date2 = parsePlainDate(req.query.date as string);
    const cost = calculateCost(age, type, baseCost, date2);
    res.json({ cost });
  });

  function parseDate(dateString: string | undefined): Date | undefined {
    if (dateString) {
      return new Date(dateString);
    }
  }

  function parsePlainDate(dateString: string | undefined): Temporal.PlainDate | undefined {
    if (dateString) {
      return Temporal.PlainDate.from(dateString);
    }
  }

  function calculateCost(age: number | undefined, type: string, baseCost: number, date2: Temporal.PlainDate | undefined) {
    if (type === "night") {
      return calculateCostForNightTicket(age, baseCost);
    } else {
      return calculateCostForDayTicket(age, baseCost, date2);
    }
  }

  function calculateCostForNightTicket(age: number | undefined, baseCost: number) {
    if (age === undefined) {
      return 0;
    }
    if (age < 6) {
      return 0;
    }
    if (age > 64) {
      return Math.ceil(baseCost * 0.4);
    }
    return baseCost;
  }

  function calculateCostForDayTicket(age: number | undefined, baseCost: number, date2: Temporal.PlainDate | undefined) {
    let reduction = calculateReduction(date2);
    if (age === undefined) {
      return Math.ceil(baseCost * (1 - reduction / 100));
    }
    if (age < 6) {
      return 0;
    }
    if (age < 15) {
      return Math.ceil(baseCost * 0.7);
    }
    if (age > 64) {
      return Math.ceil(baseCost * 0.75 * (1 - reduction / 100));
    }
    return Math.ceil(baseCost * (1 - reduction / 100));
  }

  function calculateReduction(date2: Temporal.PlainDate | undefined) {
    let reduction = 0;
    if (date2 && isMonday(date2) && !isHoliday(date2)) {
      reduction = 35;
    }
    return reduction;
  }

  function isMonday(date2: Temporal.PlainDate | undefined) {
    return date2?.dayOfWeek === 1;
  }

  function isHoliday(date2: Temporal.PlainDate | undefined) {
    const holidays = database.getHolidays();
    for (let row of holidays) {
      let holiday2 = Temporal.PlainDate.from(row.holiday)
      if (
        date2 && date2.equals(holiday2)
      ) {
        return true;
      }
    }
    return false;
  }

  return app;
}

export { createApp };
