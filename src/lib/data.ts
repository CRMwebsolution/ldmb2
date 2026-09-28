export interface Event {
  id: string;
  title: string;
  date: string; // ISO date string
  gatesOpen: string;
  raceStart: string;
  admission: string;
  kidsAdmission: string;
  description: string;
  status: "upcoming" | "past" | "cancelled";
}

export interface VehicleClass {
  id: string;
  name: string;
  description: string;
  rules: string[];
  icon: string;
  color: string;
}

export interface LeaderboardEntry {
  rank: number;
  driver: string;
  vehicle: string;
  vehicleClass: string;
  time: string;
  event: string;
  eventDate: string;
}

export interface Sponsor {
  id: string;
  name: string;
  tier: "platinum" | "gold" | "silver" | "bronze";
  website?: string;
  description?: string;
}

export interface GalleryImage {
  id: string;
  src: string;
  alt: string;
  event?: string;
  year?: number;
}

// ── Events ──────────────────────────────────────────────────────────────────

export const events: Event[] = [
  {
    id: "oct-2026",
    title: "Fall Frenzy",
    date: "2026-10-11T16:00:00",
    gatesOpen: "2:00 PM",
    raceStart: "4:00 PM",
    admission: "$10",
    kidsAdmission: "Free (12 & under)",
    description:
      "Our biggest fall event of the year! Expect packed classes, a full concession stand, and spectacular racing action as the temperatures start to cool.",
    status: "upcoming",
  },
  {
    id: "nov-2026",
    title: "November Rumble",
    date: "2026-11-08T16:00:00",
    gatesOpen: "2:00 PM",
    raceStart: "4:00 PM",
    admission: "$10",
    kidsAdmission: "Free (12 & under)",
    description:
      "Come out for one of our last events of the season. Always a crowd-pleaser with machines pushing the limits before the holiday break.",
    status: "upcoming",
  },
  {
    id: "dec-2026",
    title: "Year-End Showdown",
    date: "2026-12-13T16:00:00",
    gatesOpen: "2:00 PM",
    raceStart: "4:00 PM",
    admission: "$10",
    kidsAdmission: "Free (12 & under)",
    description:
      "The season finale! Top drivers from every class compete for bragging rights heading into the new year. Don't miss it.",
    status: "upcoming",
  },
  {
    id: "sep-2026",
    title: "September Splash",
    date: "2026-09-14T16:00:00",
    gatesOpen: "2:00 PM",
    raceStart: "4:00 PM",
    admission: "$10",
    kidsAdmission: "Free (12 & under)",
    description:
      "Late summer heat and mud — a perfect combination. September always brings out the brave and the bold.",
    status: "past",
  },
  {
    id: "aug-2026",
    title: "Dog Days Mud Bash",
    date: "2026-08-10T16:00:00",
    gatesOpen: "2:00 PM",
    raceStart: "4:00 PM",
    admission: "$10",
    kidsAdmission: "Free (12 & under)",
    description:
      "Nothing beats August mud racing in coastal NC. Come cool off — the mud will handle the rest.",
    status: "past",
  },
  {
    id: "jul-2026",
    title: "Independence Mud Run",
    date: "2026-07-12T16:00:00",
    gatesOpen: "2:00 PM",
    raceStart: "4:00 PM",
    admission: "$10",
    kidsAdmission: "Free (12 & under)",
    description:
      "Celebrate summer with horsepower and horseplay! One of the most popular events of the year.",
    status: "past",
  },
];

// ── Vehicle Classes ──────────────────────────────────────────────────────────

export const vehicleClasses: VehicleClass[] = [
  {
    id: "street",
    name: "Street Class",
    description:
      "Your daily driver takes the pit. Street-legal vehicles run on stock or mildly upgraded tires. Perfect for first-timers and spectators who want to join the action.",
    rules: [
      "Must be street legal and inspected",
      "Stock or street-legal tires only",
      "No chassis modifications",
      "Must have working headlights and tail lights",
    ],
    icon: "🚗",
    color: "sky",
  },
  {
    id: "mild-modified",
    name: "Mild Modified",
    description:
      "A step above street class. Vehicles may have lift kits, bigger tires, and light engine modifications — but still resemble a road-going machine.",
    rules: [
      "Lift kit allowed (up to 6 inches)",
      "Mud tires up to 35 inches",
      "Minor engine modifications permitted",
      "Safety cage recommended",
    ],
    icon: "🛻",
    color: "emerald",
  },
  {
    id: "modified",
    name: "Modified",
    description:
      "Serious builds with purpose-built drivetrain upgrades, lockers, and aggressive rubber. This class separates the weekend warriors from the dedicated mudders.",
    rules: [
      "Full lockers allowed",
      "Tires up to 40 inches",
      "Engine swaps permitted",
      "Roll cage required",
    ],
    icon: "🏎️",
    color: "amber",
  },
  {
    id: "super-modified",
    name: "Super Modified",
    description:
      "No-holds-barred builds engineered specifically for the bog. Expect big tires, tube chassis, and serious horsepower.",
    rules: [
      "Any tire size allowed",
      "Tube chassis permitted",
      "Any engine configuration",
      "Full safety harness required",
    ],
    icon: "⚙️",
    color: "orange",
  },
  {
    id: "diesel",
    name: "Diesel Class",
    description:
      "Coal-rollers and torque monsters battle it out. Diesel-powered vehicles only — and they never disappoint.",
    rules: [
      "Diesel engines only",
      "Fuel additives allowed",
      "Tires up to 44 inches",
      "Roll cage strongly recommended",
    ],
    icon: "💨",
    color: "stone",
  },
  {
    id: "unlimited",
    name: "Unlimited",
    description:
      "The wildest class at Little Doo. These machines are purpose-built mud monsters with extreme horsepower and zero compromises.",
    rules: [
      "Any engine, any fuel",
      "No tire size restriction",
      "Full tube chassis builds welcome",
      "Full safety equipment mandatory",
    ],
    icon: "🔥",
    color: "red",
  },
];

// ── Leaderboard ──────────────────────────────────────────────────────────────

export const leaderboardEntries: LeaderboardEntry[] = [
  // Sep 2026 Results
  { rank: 1, driver: "Jake Harlow", vehicle: "2018 Chevy Silverado", vehicleClass: "Street Class", time: "14.2s", event: "September Splash", eventDate: "Sep 14, 2026" },
  { rank: 2, driver: "Megan Tull", vehicle: "2020 Ford F-150", vehicleClass: "Street Class", time: "15.1s", event: "September Splash", eventDate: "Sep 14, 2026" },
  { rank: 3, driver: "Chris Dawson", vehicle: "2016 Ram 1500", vehicleClass: "Street Class", time: "15.8s", event: "September Splash", eventDate: "Sep 14, 2026" },
  { rank: 1, driver: "Tyler Grimes", vehicle: "'05 Jeep Wrangler TJ", vehicleClass: "Mild Modified", time: "12.4s", event: "September Splash", eventDate: "Sep 14, 2026" },
  { rank: 2, driver: "Sandra Coe", vehicle: "'12 Toyota Tacoma", vehicleClass: "Mild Modified", time: "13.0s", event: "September Splash", eventDate: "Sep 14, 2026" },
  { rank: 1, driver: "D.J. Patterson", vehicle: "Swamper LJ", vehicleClass: "Modified", time: "10.8s", event: "September Splash", eventDate: "Sep 14, 2026" },
  { rank: 2, driver: "Robbie Lane", vehicle: "Buggy #77", vehicleClass: "Modified", time: "11.3s", event: "September Splash", eventDate: "Sep 14, 2026" },
  { rank: 1, driver: "Cody Fentress", vehicle: "The Beast", vehicleClass: "Unlimited", time: "9.1s", event: "September Splash", eventDate: "Sep 14, 2026" },
  { rank: 2, driver: "Marcus Webb", vehicle: "Webb's Wrath", vehicleClass: "Unlimited", time: "9.7s", event: "September Splash", eventDate: "Sep 14, 2026" },
  // Aug 2026 Results
  { rank: 1, driver: "Jake Harlow", vehicle: "2018 Chevy Silverado", vehicleClass: "Street Class", time: "13.9s", event: "Dog Days Mud Bash", eventDate: "Aug 10, 2026" },
  { rank: 2, driver: "Phil Watts", vehicle: "2021 GMC Sierra", vehicleClass: "Street Class", time: "14.5s", event: "Dog Days Mud Bash", eventDate: "Aug 10, 2026" },
  { rank: 1, driver: "D.J. Patterson", vehicle: "Swamper LJ", vehicleClass: "Modified", time: "10.5s", event: "Dog Days Mud Bash", eventDate: "Aug 10, 2026" },
  { rank: 1, driver: "Cody Fentress", vehicle: "The Beast", vehicleClass: "Unlimited", time: "8.9s", event: "Dog Days Mud Bash", eventDate: "Aug 10, 2026" },
  { rank: 1, driver: "Roy Simmons", vehicle: "Big Iron", vehicleClass: "Diesel Class", time: "11.2s", event: "Dog Days Mud Bash", eventDate: "Aug 10, 2026" },
];

export const events_list = [
  "All Events",
  "September Splash",
  "Dog Days Mud Bash",
  "Independence Mud Run",
];

export const classes_list = [
  "All Classes",
  "Street Class",
  "Mild Modified",
  "Modified",
  "Super Modified",
  "Diesel Class",
  "Unlimited",
];

// ── Sponsors ─────────────────────────────────────────────────────────────────

export const sponsors: Sponsor[] = [
  { id: "1", name: "Coastal Auto Parts", tier: "platinum", website: "#", description: "Your local performance parts supplier in Eastern NC" },
  { id: "2", name: "Crystal Coast Tire & Wheel", tier: "platinum", website: "#", description: "Mud, off-road, and performance tires since 1998" },
  { id: "3", name: "NC Off-Road Supply", tier: "gold", website: "#" },
  { id: "4", name: "Morehead City Motorsports", tier: "gold", website: "#" },
  { id: "5", name: "Eastern Diesel Repair", tier: "gold", website: "#" },
  { id: "6", name: "Swamp Fox Fabrication", tier: "silver", website: "#" },
  { id: "7", name: "Newport Hardware & Feed", tier: "silver", website: "#" },
  { id: "8", name: "Core Sound BBQ", tier: "silver", website: "#" },
  { id: "9", name: "Cape Carteret Welding", tier: "bronze", website: "#" },
  { id: "10", name: "Dogwood Family Campground", tier: "bronze", website: "#" },
  { id: "11", name: "Coastal Plains Towing", tier: "bronze", website: "#" },
  { id: "12", name: "Bogue Banks Bait & Tackle", tier: "bronze", website: "#" },
];

// ── Gallery ───────────────────────────────────────────────────────────────────

// Using Unsplash photos for placeholder — replace with actual event photos.
export const galleryImages: GalleryImage[] = [
  { id: "1", src: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&q=80", alt: "Truck powering through the mud pit", event: "Dog Days Mud Bash", year: 2026 },
  { id: "2", src: "https://images.unsplash.com/photo-1549924231-f129b911e442?w=800&q=80", alt: "Crowd cheering at the mud bog", event: "Dog Days Mud Bash", year: 2026 },
  { id: "3", src: "https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=800&q=80", alt: "Custom off-road build in the pits", event: "September Splash", year: 2026 },
  { id: "4", src: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80", alt: "Mud spray at the finish line", event: "September Splash", year: 2026 },
  { id: "5", src: "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=800&q=80", alt: "Race day atmosphere at Little Doo", event: "July Independence Run", year: 2026 },
  { id: "6", src: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&q=80", alt: "High-powered diesel truck launching", event: "July Independence Run", year: 2026 },
  { id: "7", src: "https://images.unsplash.com/photo-1574704473866-9ce4f7d3f99e?w=800&q=80", alt: "Jeep clearing the 200-foot pit", event: "Dog Days Mud Bash", year: 2026 },
  { id: "8", src: "https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=800&q=80", alt: "Spectators lined up trackside", event: "September Splash", year: 2026 },
  { id: "9", src: "https://images.unsplash.com/photo-1525609004556-c46c7d6cf023?w=800&q=80", alt: "Night racing action", event: "July Independence Run", year: 2026 },
];
