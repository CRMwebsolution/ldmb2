import { supabase } from "./client";
import { Race, RaceClass, RaceResult, ClassCatalog, RuleItem, SponsorItem } from "./types";

export async function getScheduledRaces(): Promise<Race[]> {
  try {
    const { data, error } = await supabase
      .from("races")
      .select("*")
      .eq("show_on_schedule", true)
      .order("date", { ascending: true });

    if (error) {
      console.error("Error fetching scheduled races:", error);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error("Fetch exception for scheduled races:", err);
    return [];
  }
}

export async function getPublishedRaces(): Promise<Race[]> {
  try {
    const { data, error } = await supabase
      .from("races")
      .select("*")
      .eq("published", true)
      .order("date", { ascending: false });

    if (error) {
      console.error("Error fetching published races:", error);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error("Fetch exception for published races:", err);
    return [];
  }
}

export async function getAllRaces(): Promise<Race[]> {
  try {
    const { data, error } = await supabase
      .from("races")
      .select("*")
      .order("date", { ascending: false });

    if (error) {
      console.error("Error fetching all races:", error);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error("Fetch exception for all races:", err);
    return [];
  }
}

export async function getRaceWithDetails(raceId: string) {
  try {
    const { data: race, error: raceError } = await supabase
      .from("races")
      .select("*")
      .eq("id", raceId)
      .single();

    if (raceError) throw raceError;

    const { data: classes, error: classError } = await supabase
      .from("classes")
      .select("*")
      .eq("race_id", raceId)
      .order("order_num", { ascending: true });

    if (classError) throw classError;

    const classIds = (classes || []).map((c) => c.id);
    let results: RaceResult[] = [];
    if (classIds.length > 0) {
      const { data: resultsData, error: resultsError } = await supabase
        .from("results")
        .select("*")
        .in("class_id", classIds)
        .order("order_num", { ascending: true });
      if (!resultsError && resultsData) {
        results = resultsData;
      }
    }

    return {
      race,
      classes: classes || [],
      results,
    };
  } catch (err) {
    console.error(`Error fetching race ${raceId} details:`, err);
    return null;
  }
}

export async function getClassCatalog(onlyActive = true): Promise<ClassCatalog[]> {
  try {
    let query = supabase.from("class_catalog").select("*").order("sort_order", { ascending: true });
    if (onlyActive) {
      query = query.eq("active", true);
    }
    const { data, error } = await query;
    if (error) {
      console.error("Error fetching class catalog:", error);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error("Fetch exception for class catalog:", err);
    return [];
  }
}

export async function getRules(): Promise<RuleItem[]> {
  try {
    const { data, error } = await supabase
      .from("rules")
      .select("*")
      .order("sort_order", { ascending: true });

    if (error) {
      console.error("Error fetching rules:", error);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error("Fetch exception for rules:", err);
    return [];
  }
}

export async function getSponsors(onlyActive = true): Promise<SponsorItem[]> {
  try {
    let query = supabase.from("sponsors").select("*").order("display_order", { ascending: true });
    if (onlyActive) {
      query = query.eq("active", true);
    }
    const { data, error } = await query;
    if (error) {
      console.error("Error fetching sponsors:", error);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error("Fetch exception for sponsors:", err);
    return [];
  }
}
