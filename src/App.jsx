import { useEffect, useRef, useState } from "react";
import { supabase } from "./supabaseClient";

const GREAT_LAKES_DOMAIN = "greatlakes.edu.in";
const USE_TEMP_PROFILE_EDITOR = false;
const PROFILE_PHOTO_MAX_BYTES = 1 * 1024 * 1024;
const PROFILE_PHOTO_SOURCE_MAX_BYTES = 10 * 1024 * 1024;
const PROFILE_PHOTO_MAX_DIMENSION = 1200;
const PROFILE_PHOTO_ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const PROFILE_PHOTO_OUTPUT_TYPE = "image/webp";
const PROFILE_PHOTO_OUTPUT_NAME = "profile.webp";
const DEFAULT_PHOTO_ADJUSTMENTS = { zoom: 1, rotation: 0, offsetX: 0, offsetY: 0 };

function clampPhotoOffset(value, zoom) {
  const maxOffset = Math.max(0, (zoom - 1) / 2);
  return Math.min(maxOffset, Math.max(-maxOffset, value));
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error("Unable to compress profile photo."));
      }
    }, type, quality);
  });
}

function loadImageFile(file) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Unable to read profile photo."));
    };

    image.src = objectUrl;
  });
}

async function compressProfilePhoto(file, adjustments = DEFAULT_PHOTO_ADJUSTMENTS) {
  const image = await loadImageFile(file);
  const sourceWidth = image.naturalWidth || image.width;
  const sourceHeight = image.naturalHeight || image.height;

  if (!sourceWidth || !sourceHeight) {
    throw new Error("Unable to read profile photo dimensions.");
  }

  let maxDimension = Math.min(PROFILE_PHOTO_MAX_DIMENSION, Math.max(sourceWidth, sourceHeight));
  const qualitySteps = [0.86, 0.78, 0.7, 0.62, 0.54, 0.46, 0.38, 0.3];
  const zoom = Math.min(3, Math.max(1, Number(adjustments.zoom) || 1));
  const rotation = ((Number(adjustments.rotation) || 0) * Math.PI) / 180;
  const rotatedBounds = Math.abs(Math.cos(rotation)) + Math.abs(Math.sin(rotation));
  const offsetX = clampPhotoOffset(Number(adjustments.offsetX) || 0, zoom);
  const offsetY = clampPhotoOffset(Number(adjustments.offsetY) || 0, zoom);

  while (maxDimension >= 360) {
    const canvas = document.createElement("canvas");
    const outputSize = Math.max(1, Math.round(maxDimension));
    canvas.width = outputSize;
    canvas.height = outputSize;

    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Unable to compress profile photo in this browser.");
    }

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, outputSize, outputSize);
    context.translate((outputSize / 2) + (offsetX * outputSize), (outputSize / 2) + (offsetY * outputSize));
    context.rotate(rotation);

    const coverScale = (outputSize * rotatedBounds * zoom) / Math.min(sourceWidth, sourceHeight);
    const drawWidth = sourceWidth * coverScale;
    const drawHeight = sourceHeight * coverScale;
    context.drawImage(image, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);

    for (const quality of qualitySteps) {
      const blob = await canvasToBlob(canvas, PROFILE_PHOTO_OUTPUT_TYPE, quality);
      if (blob.type !== PROFILE_PHOTO_OUTPUT_TYPE) {
        throw new Error("This browser could not create a WebP profile photo.");
      }

      if (blob.size <= PROFILE_PHOTO_MAX_BYTES) {
        return new File([blob], PROFILE_PHOTO_OUTPUT_NAME, { type: PROFILE_PHOTO_OUTPUT_TYPE });
      }
    }

    maxDimension = Math.floor(maxDimension * 0.8);
  }

  throw new Error("Profile photo could not be compressed below 1MB. Try a smaller image.");
}
const TEMP_PROFILE_USER = {
  id: "00000000-0000-4000-8000-000000000001",
  email: `preview@${GREAT_LAKES_DOMAIN}`,
  user_metadata: {
    full_name: "Preview User"
  }
};

const sections = [
  {
    id: "education",
    number: "2",
    title: "Education",
    icon: "cap",
    fields: [
      { name: "college_university", label: "College / University", placeholder: "Enter college / university" },
      { name: "degree_course", label: "Degree / Course", placeholder: "Enter degree or course" },
      { name: "time_period", label: "Time Period", type: "period" },
      { name: "score", label: "Score / CGPA (Optional)", placeholder: "e.g., 8.5 or 85%" }
    ]
  },
  {
    id: "work_experience",
    number: "3",
    title: "Work Experience",
    icon: "briefcase",
    fields: [
      { name: "company", label: "Company", placeholder: "Enter company name" },
      { name: "role_designation", label: "Role / Designation", placeholder: "Enter your role" },
      { name: "time_period", label: "Time Period", type: "period" },
      { name: "description", label: "Work Done / Description", placeholder: "Describe your key responsibilities and impact", type: "textarea" }
    ]
  },
  {
    id: "internships",
    number: "4",
    title: "Internships",
    icon: "briefcase",
    fields: [
      { name: "company", label: "Company", placeholder: "Enter company name" },
      { name: "role_designation", label: "Role / Designation", placeholder: "Enter your role" },
      { name: "time_period", label: "Time Period", type: "period" },
      { name: "description", label: "Work Done / Description", placeholder: "Describe your key responsibilities and impact", type: "textarea" }
    ]
  },
  {
    id: "clubs",
    number: "5",
    title: "Club / Committee",
    icon: "users",
    fields: [
      { name: "club_committee_name", label: "Club / Committee Name", placeholder: "Enter club or committee name" },
      { name: "position_role", label: "Position / Role", placeholder: "Enter your position or role" }
    ]
  },
  {
    id: "certifications",
    number: "6",
    title: "Certifications",
    icon: "badge",
    fields: [
      { name: "certification_name", label: "Certification Name", placeholder: "Enter certification name" },
      { name: "platform_institute", label: "Platform / Institute", placeholder: "Enter platform or institute" },
      { name: "year", label: "Year", placeholder: "Enter year", type: "year" }
    ]
  },
  {
    id: "projects",
    number: "7",
    title: "Projects",
    icon: "folder",
    fields: [
      { name: "project_title", label: "Project Title", placeholder: "Enter project title" },
      { name: "role", label: "Role", placeholder: "Your role in the project" },
      { name: "tools_skills", label: "Tools / Skills", placeholder: "e.g., Python, Excel, Tableau" },
      { name: "description", label: "Description", placeholder: "Describe the project and outcomes", type: "textarea" }
    ]
  },
  {
    id: "publications",
    number: "8",
    title: "Publications",
    icon: "book",
    fields: [
      { name: "title", label: "Title", placeholder: "Enter publication title" },
      { name: "platform_journal", label: "Platform / Journal", placeholder: "Enter journal or platform" },
      { name: "year", label: "Year", placeholder: "Select month and year", type: "month" },
      { name: "link_details", label: "Link / Details", placeholder: "Enter link or publication details" }
    ]
  },
  {
    id: "case_competitions",
    number: "9",
    title: "Case Competitions",
    icon: "trophy",
    fields: [
      { name: "competition_name", label: "Competition Name", placeholder: "Enter competition name" },
      { name: "college_company", label: "College / Company", placeholder: "Enter college or company" },
      { name: "rank", label: "Rank", placeholder: "Enter rank or achievement" }
    ]
  },
  {
    id: "achievements",
    number: "10",
    title: "Achievements",
    icon: "star",
    fields: [
      { name: "achievement_title", label: "Achievement Title", placeholder: "Enter achievement title" },
      { name: "organisation_event", label: "Organisation / Event", placeholder: "Enter organisation or event" },
      { name: "year", label: "Year", placeholder: "Select month and year", type: "month" },
      { name: "description_rank", label: "Description / Rank", placeholder: "Enter description or rank", type: "textarea" }
    ]
  }
];

const helpOptions = ["Case Competitions", "Interview Prep", "GDPI Prep"];
const programOptions = ["PGDM 27", "PGDM 28", "PGCM 27"];
const specialisationOptions = ["Marketing", "Finance", "Operations", "Analytics", "HR", "Strategy"];
const directoryProfileSelect = [
  "id",
  "full_name",
  "program",
  "major_specialisation",
  "minor_specialisation",
  "can_help_with",
  "profile_photo_url",
  "linkedin_url",
  "education",
  "work_experience",
  "internships",
  "clubs",
  "certifications",
  "projects",
  "publications",
  "case_competitions",
  "achievements"
].join(", ");
const sampleProfile = {
  id: "sample-aarya-vashisth",
  full_name: "Aarya Vashisth",
  email: "aarya@greatlakes.edu.in",
  linkedin_url: "https://www.linkedin.com/in/aaryavashisth/",
  contact_number: "+91 98765 43210",
  program: "PGDM 27",
  major_specialisation: "Marketing",
  minor_specialisation: "Analytics",
  can_help_with: ["Case Competitions", "GDPI Prep"],
  profile_photo_url: "",
  education: [
    {
      college_university: "Great Lakes Institute of Management",
      degree_course: "PGDM",
      time_period: { start: "2025-06-01", end: "2027-03-01" },
      score: "Dean's List"
    },
    {
      college_university: "University of Delhi",
      degree_course: "B.Com (Hons)",
      time_period: { start: "2020-08-01", end: "2023-06-01" },
      score: "8.2 CGPA"
    }
  ],
  work_experience: [
    {
      company: "ThinkMBA Labs",
      role_designation: "Growth Strategy Intern",
      time_period: { start: "2024-05-01", end: "2024-08-01" },
      description: "Built acquisition experiments and analyzed campaign performance."
    }
  ],
  internships: [
    {
      company: "InsideMBA",
      role_designation: "Product Marketing Intern",
      time_period: { start: "2023-09-01", end: "2023-12-01" },
      description: "Created content systems for MBA aspirants and mapped learner journeys."
    }
  ],
  clubs: [
    {
      club_committee_name: "Marketing Club",
      position_role: "Core Member"
    }
  ],
  certifications: [
    {
      certification_name: "Google Analytics Certification",
      platform_institute: "Google",
      year: "2024"
    }
  ],
  projects: [
    {
      project_title: "CampusConnect",
      role: "Product and Frontend",
      tools_skills: "React, Supabase, Vercel",
      description: "Student profile directory for peer discovery and mentorship."
    }
  ],
  publications: [
    {
      title: "MBA Prep Resource Map",
      platform_journal: "ThinkMBA",
      year: "2024",
      link_details: "Internal research note"
    }
  ],
  case_competitions: [
    {
      competition_name: "National Marketing Challenge",
      college_company: "IIM Indore",
      rank: "National Finalist"
    }
  ],
  achievements: [
    {
      achievement_title: "Student Builder Award",
      organisation_event: "Great Lakes",
      year: "2025",
      description_rank: "Recognised for building student utility tools."
    }
  ]
};
const sampleDirectoryProfiles = Array.from({ length: 8 }, (_, index) => ({
  ...sampleProfile,
  id: `${sampleProfile.id}-${index + 1}`
}));

function getSpecialisationDisplay(profile) {
  const major = profile.major_specialisation || "";
  const minor = profile.minor_specialisation || "";

  if (major && minor) {
    return `${major}-${minor}`;
  }

  return major || minor || "Not added";
}

function createEmptyRow(section) {
  return Object.fromEntries(
    section.fields.map((field) => [
      field.name,
      field.type === "period" ? { start: "", end: "" } : ""
    ])
  );
}

function createEmptySectionRows() {
  return Object.fromEntries(sections.map((section) => [section.id, [createEmptyRow(section)]]));
}

function isBlankValue(value) {
  if (typeof value === "string") {
    return value.trim() === "";
  }

  if (value && typeof value === "object") {
    return Object.values(value).every(isBlankValue);
  }

  return value == null;
}

function cleanRows(rows) {
  return rows
    .map((row) => Object.fromEntries(
      Object.entries(row).map(([key, value]) => {
        if (key === "time_period" && value && typeof value === "object") {
          return [key, {
            start: isMonthInputValue(value.start) ? value.start : "",
            end: isMonthInputValue(value.end) ? value.end : ""
          }];
        }

        if (key === "year") {
          return [key, isMonthInputValue(value) || isYearInputValue(value) ? value.trim() : ""];
        }

        return [key, value];
      })
    ))
    .filter((row) => Object.values(row).some((value) => !isBlankValue(value)));
}

function toTitleCaseName(value) {
  if (!value) {
    return "";
  }

  return value
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getAccountName(user) {
  const metadataName = user?.user_metadata?.full_name;

  if (metadataName) {
    return toTitleCaseName(metadataName);
  }

  const emailName = user?.email?.split("@")[0].replace(/[._-]+/g, " ");
  return toTitleCaseName(emailName) || "User";
}

function getExternalUrl(value) {
  const trimmedValue = value?.trim();

  if (!trimmedValue) {
    return "";
  }

  return /^https?:\/\//i.test(trimmedValue) ? trimmedValue : `https://${trimmedValue}`;
}

function isGreatLakesEmail(email) {
  return email?.toLowerCase().endsWith(`@${GREAT_LAKES_DOMAIN}`);
}

function collectSearchText(value) {
  if (Array.isArray(value)) {
    return value.map(collectSearchText).join(" ");
  }

  if (value && typeof value === "object") {
    return Object.values(value).map(collectSearchText).join(" ");
  }

  return value == null ? "" : String(value);
}

function profileMatchesFilters(profile, filters) {
  const searchValue = filters.search.trim().toLowerCase();
  const profileSearchText = collectSearchText(profile).toLowerCase();
  const canHelpWith = Array.isArray(profile.can_help_with) ? profile.can_help_with : [];

  if (searchValue && !profileSearchText.includes(searchValue)) {
    return false;
  }

  if (filters.batch && profile.program !== filters.batch) {
    return false;
  }

  if (
    filters.specialisation
    && profile.major_specialisation !== filters.specialisation
    && profile.minor_specialisation !== filters.specialisation
  ) {
    return false;
  }

  if (filters.canHelpWith && !canHelpWith.includes(filters.canHelpWith)) {
    return false;
  }

  return true;
}

function updateBrowserHistory(nextView, { replace = false } = {}) {
  const hash = nextView === "directory" ? "" : `#${nextView}`;
  const nextUrl = `${window.location.pathname}${window.location.search}${hash}`;
  const nextState = {
    ...(window.history.state || {}),
    insideMbaView: nextView
  };

  if (replace) {
    window.history.replaceState(nextState, "", nextUrl);
    return;
  }

  window.history.pushState(nextState, "", nextUrl);
}

function Icon({ name }) {
  const icons = {
    google: "G",
    shield: "S",
    info: "i",
    user: "U",
    camera: "C",
    linkedin: "in",
    phone: "P",
    cap: "E",
    briefcase: "W",
    users: "C",
    badge: "B",
    folder: "F",
    book: "P",
    trophy: "T",
    star: "A",
    calendar: "D",
    trash: "x",
    plus: "+",
    eye: "o",
    lock: "L"
  };

  return <span className={`icon icon-${name}`} aria-hidden="true">{icons[name]}</span>;
}

function DownArrow({ className = "dropdown-caret" }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="9"
      viewBox="0 0 14 9"
      fill="none"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M6.98537 8.26681L13.9707 1.28325L12.6893 0L6.98537 5.70394L1.28325 0L0 1.28325L6.98537 8.26681Z"
        fill="#757575"
      />
    </svg>
  );
}

function CalendarIcon({ className = "calendar-glyph" }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M2 12C2 8.229 2 6.343 3.172 5.172C4.344 4.001 6.229 4 10 4H14C17.771 4 19.657 4 20.828 5.172C21.999 6.344 22 8.229 22 12V14C22 17.771 22 19.657 20.828 20.828C19.656 21.999 17.771 22 14 22H10C6.229 22 4.343 22 3.172 20.828C2.001 19.656 2 17.771 2 14V12Z"
        stroke="black"
        strokeWidth="1.5"
      />
      <path
        d="M7 4V2.5M17 4V2.5M2.5 9H21.5"
        stroke="black"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M18 17C18 17.2652 17.8946 17.5196 17.7071 17.7071C17.5196 17.8946 17.2652 18 17 18C16.7348 18 16.4804 17.8946 16.2929 17.7071C16.1054 17.5196 16 17.2652 16 17C16 16.7348 16.1054 16.4804 16.2929 16.2929C16.4804 16.1054 16.7348 16 17 16C17.2652 16 17.5196 16.1054 17.7071 16.2929C17.8946 16.4804 18 16.7348 18 17ZM18 13C18 13.2652 17.8946 13.5196 17.7071 13.7071C17.5196 13.8946 17.2652 14 17 14C16.7348 14 16.4804 13.8946 16.2929 13.7071C16.1054 13.5196 16 13.2652 16 13C16 12.7348 16.1054 12.4804 16.2929 12.2929C16.4804 12.1054 16.7348 12 17 12C17.2652 12 17.5196 12.1054 17.7071 12.2929C17.8946 12.4804 18 12.7348 18 13ZM13 17C13 17.2652 12.8946 17.5196 12.7071 17.7071C12.5196 17.8946 12.2652 18 12 18C11.7348 18 11.4804 17.8946 11.2929 17.7071C11.1054 17.5196 11 17.2652 11 17C11 16.7348 11.1054 16.4804 11.2929 16.2929C11.4804 16.1054 11.7348 16 12 16C12.2652 16 12.5196 16.1054 12.7071 16.2929C12.8946 16.4804 13 16.7348 13 17ZM13 13C13 13.2652 12.8946 13.5196 12.7071 13.7071C12.5196 13.8946 12.2652 14 12 14C11.7348 14 11.4804 13.8946 11.2929 13.7071C11.1054 13.5196 11 13.2652 11 13C11 12.7348 11.1054 12.4804 11.2929 12.2929C11.4804 12.1054 11.7348 12 12 12C12.2652 12 12.5196 12.1054 12.7071 12.2929C12.8946 12.4804 13 12.7348 13 13ZM8 17C8 17.2652 7.89464 17.5196 7.70711 17.7071C7.51957 17.8946 7.26522 18 7 18C6.73478 18 6.48043 17.8946 6.29289 17.7071C6.10536 17.5196 6 17.2652 6 17C6 16.7348 6.10536 16.4804 6.29289 16.2929C6.48043 16.1054 6.73478 16 7 16C7.26522 16 7.51957 16.1054 7.70711 16.2929C7.89464 16.4804 8 16.7348 8 17ZM8 13C8 13.2652 7.89464 13.5196 7.70711 13.7071C7.51957 13.8946 7.26522 14 7 14C6.73478 14 6.48043 13.8946 6.29289 13.7071C6.10536 13.5196 6 13.2652 6 13C6 12.7348 6.10536 12.4804 6.29289 12.2929C6.48043 12.1054 6.73478 12 7 12C7.26522 12 7.51957 12.1054 7.70711 12.2929C7.89464 12.4804 8 12.7348 8 13Z"
        fill="black"
      />
    </svg>
  );
}

function LinkedinIcon({ className = "linkedin-glyph" }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <g clipPath="url(#linkedin-clip)">
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M1.77813 16H14.2219C15.2031 16 16 15.2031 16 14.2219V1.77813C16 0.796875 15.2031 0 14.2219 0H1.77813C0.796875 0 0 0.796875 0 1.77813V14.2219C0 15.2031 0.796875 16 1.77813 16Z"
          fill="#007EBB"
        />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M13.7779 13.7782H11.4029V9.73442C11.4029 8.62505 10.9811 8.0063 10.1029 8.0063C9.1498 8.0063 8.6498 8.65005 8.6498 9.73442V13.7782H6.3623V6.07505H8.6498V7.11255C8.6498 7.11255 9.3373 5.84067 10.9717 5.84067C12.6061 5.84067 13.7748 6.83755 13.7748 8.90317V13.7782H13.7779ZM3.63418 5.06567C2.85605 5.06567 2.22168 4.42817 2.22168 3.6438C2.22168 2.85942 2.85293 2.22192 3.63418 2.22192C4.41543 2.22192 5.04355 2.85942 5.04355 3.6438C5.04355 4.42817 4.4123 5.06567 3.63418 5.06567ZM2.45293 13.7782H4.84043V6.07505H2.45293V13.7782Z"
          fill="white"
        />
      </g>
      <defs>
        <clipPath id="linkedin-clip">
          <rect width="16" height="16" fill="white" />
        </clipPath>
      </defs>
    </svg>
  );
}

function DirectoryHeader({
  user,
  onLogin,
  onLogout,
  onNavigate,
  showFilters = true,
  filters,
  onFiltersChange
}) {
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const accountRef = useRef(null);

  useEffect(() => {
    if (!isAccountOpen) {
      return undefined;
    }

    function handlePointerDown(event) {
      if (!accountRef.current?.contains(event.target)) {
        setIsAccountOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setIsAccountOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isAccountOpen]);

  return (
    <header className="topbar" aria-label="InsideMBA header">
      <button className="brand" type="button" onClick={() => onNavigate("directory")}>
        InsideMBA
      </button>

      {user && showFilters ? (
        <div className="filters" aria-label="Directory filters">
          <label className="field field-search">
            <span className="sr-only">Search</span>
            <input
              type="search"
              placeholder="Search by name, company, role, or domain"
              value={filters.search}
              onChange={(event) => onFiltersChange("search", event.target.value)}
            />
          </label>

          <label className="field field-small">
            <span className="sr-only">Batch</span>
            <select value={filters.batch} onChange={(event) => onFiltersChange("batch", event.target.value)}>
              <option value="">Batch</option>
              {programOptions.map((program) => (
                <option key={program} value={program}>{program}</option>
              ))}
            </select>
          </label>

          <label className="field field-small">
            <span className="sr-only">Specialisation</span>
            <select
              value={filters.specialisation}
              onChange={(event) => onFiltersChange("specialisation", event.target.value)}
            >
              <option value="">Specialisation</option>
              {specialisationOptions.map((specialisation) => (
                <option key={specialisation} value={specialisation}>{specialisation}</option>
              ))}
            </select>
          </label>

          <label className="field field-help">
            <span className="sr-only">Can Help With</span>
            <select
              value={filters.canHelpWith}
              onChange={(event) => onFiltersChange("canHelpWith", event.target.value)}
            >
              <option value="">Can Help With</option>
              {helpOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </label>
        </div>
      ) : null}

      {user ? (
        <div className="account-preview" ref={accountRef}>
          <button
            className="account-name-button"
            type="button"
            aria-expanded={isAccountOpen}
            onClick={() => setIsAccountOpen((open) => !open)}
          >
            {getAccountName(user)}
            <DownArrow className={`account-caret ${isAccountOpen ? "is-open" : ""}`} />
          </button>
          {isAccountOpen ? (
            <div className="account-dropdown" aria-label="Account menu">
              <button
                type="button"
                onClick={() => {
                  setIsAccountOpen(false);
                  onNavigate("profile");
                }}
              >
                My Profile
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsAccountOpen(false);
                  onLogout();
                }}
              >
                Sign Out
              </button>
            </div>
          ) : null}
        </div>
      ) : (
        <button className="login-button" type="button" onClick={onLogin}>
          Sign in with Google
        </button>
      )}
    </header>
  );
}

function CreateProfileHeader({ onHome }) {
  return (
    <header className="profile-topbar">
      <div className="profile-brand">
        <div className="google-mark"><Icon name="google" /></div>
        <button className="profile-logo" type="button" onClick={onHome}>GLIM<span>CONNECT</span></button>
        <div className="profile-divider" />
        <h1>Create Your Profile</h1>
      </div>

      <div className="privacy-note">
        <Icon name="shield" />
        <span>Your profile appears in directory after saving</span>
        <Icon name="info" />
      </div>
    </header>
  );
}

function MiniProfileCard({ profile, onOpen }) {
  const specialisation = getSpecialisationDisplay(profile);
  const displayName = toTitleCaseName(profile.full_name) || "Unnamed Profile";
  const linkedinUrl = getExternalUrl(profile.linkedin_url);

  return (
    <article className="mini-profile-card" aria-label={`${displayName} profile preview`}>
      <button className="mini-card-button" type="button" onClick={() => onOpen(profile)}>
        <div className="mini-card-photo">
          {profile.profile_photo_url ? (
            <img src={profile.profile_photo_url} alt={`${displayName} profile`} />
          ) : null}
        </div>
        <div className="mini-card-name-row">
          <h2>{displayName}</h2>
        </div>
        <dl className="mini-card-meta">
          <div>
            <dt>Specialisation</dt>
            <dd>{specialisation}</dd>
          </div>
          <div>
            <dt>Batch</dt>
            <dd>{profile.program}</dd>
          </div>
        </dl>
      </button>
      {linkedinUrl ? (
        <a
          className="mini-card-linkedin"
          href={linkedinUrl}
          aria-label={`${displayName} LinkedIn profile`}
          target="_blank"
          rel="noreferrer"
        >
          <LinkedinIcon />
        </a>
      ) : null}
    </article>
  );
}

function DirectoryScreen({ user, directoryProfiles, isLoading, hasActiveFilters, onOpenProfile }) {
  return (
    <main className="directory-canvas" aria-label="Directory">
      {!user ? (
        <section className="auth-gate" aria-label="Sign in required">
          <p>Sign in with Google to see the profiles.</p>
        </section>
      ) : isLoading ? (
        <section className="empty-directory" aria-label="Directory state">
          <p>Loading profiles...</p>
        </section>
      ) : directoryProfiles.length === 0 ? (
        <section className="empty-directory" aria-label="Directory state">
          <p>{hasActiveFilters ? "No profiles match your filters." : "No profiles have been added yet."}</p>
        </section>
      ) : (
        <section className="mini-card-grid" aria-label="Student profile cards">
          {directoryProfiles.map((profile) => (
            <MiniProfileCard key={profile.id} profile={profile} onOpen={onOpenProfile} />
          ))}
        </section>
      )}
    </main>
  );
}

function formatMonthYear(value) {
  if (!value) {
    return "Present";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
}

function formatPeriod(period) {
  if (!period || typeof period !== "object") {
    return "";
  }

  return `${formatMonthYear(period.start)} - ${formatMonthYear(period.end)}`;
}

function DetailSection({ title, rows, children }) {
  const visibleRows = Array.isArray(rows)
    ? rows.filter((row) => Object.values(row).some((value) => !isBlankValue(value)))
    : [];

  if (visibleRows.length === 0) {
    return null;
  }

  return (
    <section className="detail-section">
      <h3>{title}</h3>
      <div className="detail-section-list">{children(visibleRows)}</div>
    </section>
  );
}

function DetailRow({ primary, secondary, meta, description, action }) {
  return (
    <article className="detail-row">
      <strong>{primary}</strong>
      {secondary ? <span>{secondary}</span> : <span />}
      {meta ? <span>{meta}</span> : <span />}
      {action ? <a href={action.href}>{action.label}</a> : null}
      {description ? <p>{description}</p> : null}
    </article>
  );
}

function DescriptionEditorField({ label, placeholder, value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const textareaRef = useRef(null);
  const previewText = value?.trim() || placeholder;

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    textareaRef.current?.focus();

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  return (
    <div className="profile-field">
      <span className="profile-label">{label}</span>
      <button
        className={`input-shell textarea-shell textarea-preview-shell ${value ? "has-value" : ""}`}
        type="button"
        onClick={() => setIsOpen(true)}
      >
        <span>{previewText}</span>
      </button>

      {isOpen ? (
        <div className="description-modal-backdrop" role="presentation">
          <section className="description-modal" role="dialog" aria-modal="true" aria-label={label}>
            <div className="description-modal-header">
              <h2>{label}</h2>
              <button type="button" onClick={() => setIsOpen(false)}>Close</button>
            </div>
            <textarea
              ref={textareaRef}
              value={value}
              placeholder={placeholder}
              onChange={(event) => onChange(event.target.value)}
            />
          </section>
        </div>
      ) : null}
    </div>
  );
}

function DetailedProfileView({ profile, profiles, onSelectProfile, onClose }) {
  const otherProfiles = profiles.filter((item) => item.id !== profile.id);
  const specialisation = getSpecialisationDisplay(profile);
  const [major = "Not added", minor = "Not added"] = specialisation === "Not added"
    ? ["Not added", "Not added"]
    : specialisation.split("-");
  const canHelpWith = Array.isArray(profile.can_help_with) ? profile.can_help_with : [];

  return (
    <main className="detail-layout" aria-label={`${profile.full_name} detailed profile`}>
      <section className="detail-card">
        <button className="detail-close-button" type="button" onClick={onClose} aria-label="Close full profile">
          Close
        </button>
        <div className="detail-header">
          <div className="detail-avatar">
            {profile.profile_photo_url ? (
              <img src={profile.profile_photo_url} alt={`${profile.full_name} profile`} />
            ) : null}
          </div>
          <div className="detail-profile-copy">
            <div className="detail-name-row">
              <h2>{profile.full_name}</h2>
              {profile.linkedin_url ? (
                <a
                  className="detail-linkedin"
                  href={profile.linkedin_url}
                  aria-label={`${profile.full_name} LinkedIn profile`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <LinkedinIcon className="detail-linkedin-glyph" />
                </a>
              ) : null}
            </div>
            {profile.email ? <p>{profile.email}</p> : null}
            {profile.contact_number ? <p>{profile.contact_number}</p> : null}
            <p className="detail-program">
              <strong>{profile.program || "Program not added"}</strong>
              <span aria-hidden="true">•</span>
              <span>Great Lakes Institute of Management</span>
            </p>
            <p className="detail-specialisation">
              <span>Majors: {major || "Not added"}</span>
              <span>Minors: {minor || "Not added"}</span>
            </p>

            {canHelpWith.length > 0 ? (
              <div className="detail-help">
                <strong>Can Help With:</strong>
                {canHelpWith.map((item) => (
                  <span key={item}>{item}</span>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <DetailSection title="Education" rows={profile.education}>
          {(rows) => rows.map((row, index) => (
            <DetailRow
              key={`${row.degree_course}-${index}`}
              primary={row.college_university}
              secondary={row.degree_course}
              meta={`${formatPeriod(row.time_period)} | ${row.score}`}
            />
          ))}
        </DetailSection>

        <DetailSection title="Work Experience" rows={profile.work_experience}>
          {(rows) => rows.map((row, index) => (
            <DetailRow
              key={`${row.company}-${index}`}
              primary={row.company}
              secondary={row.role_designation}
              meta={formatPeriod(row.time_period)}
              description={row.description}
            />
          ))}
        </DetailSection>

        <DetailSection title="Internships" rows={profile.internships}>
          {(rows) => rows.map((row, index) => (
            <DetailRow
              key={`${row.company}-${index}`}
              primary={row.company}
              secondary={row.role_designation}
              meta={formatPeriod(row.time_period)}
              description={row.description}
            />
          ))}
        </DetailSection>

        <DetailSection title="Club / Committee" rows={profile.clubs}>
          {(rows) => rows.map((row, index) => (
            <DetailRow
              key={`${row.club_committee_name}-${index}`}
              primary={row.club_committee_name}
              secondary={row.position_role}
            />
          ))}
        </DetailSection>

        <DetailSection title="Certifications" rows={profile.certifications}>
          {(rows) => rows.map((row, index) => (
            <DetailRow
              key={`${row.certification_name}-${index}`}
              primary={row.certification_name}
              secondary={row.platform_institute}
              meta={row.year}
            />
          ))}
        </DetailSection>

        <DetailSection title="Projects" rows={profile.projects}>
          {(rows) => rows.map((row, index) => (
            <DetailRow
              key={`${row.project_title}-${index}`}
              primary={row.project_title}
              secondary={row.role}
              meta={row.tools_skills}
              description={row.description}
            />
          ))}
        </DetailSection>

        <DetailSection title="Publications" rows={profile.publications}>
          {(rows) => rows.map((row, index) => (
            <DetailRow
              key={`${row.title}-${index}`}
              primary={row.title}
              secondary={row.platform_journal}
              meta={row.year}
              action={profile.linkedin_url ? { href: profile.linkedin_url, label: "View" } : null}
            />
          ))}
        </DetailSection>

        <DetailSection title="Case Competitions" rows={profile.case_competitions}>
          {(rows) => rows.map((row, index) => (
            <DetailRow
              key={`${row.competition_name}-${index}`}
              primary={row.competition_name}
              secondary={row.college_company}
              meta={row.rank}
            />
          ))}
        </DetailSection>

        <DetailSection title="Achievements" rows={profile.achievements}>
          {(rows) => rows.map((row, index) => (
            <DetailRow
              key={`${row.achievement_title}-${index}`}
              primary={row.achievement_title}
              secondary={row.organisation_event}
              meta={row.year}
              description={row.description_rank}
            />
          ))}
        </DetailSection>
      </section>

      <aside className="detail-rail" aria-label="Other profiles">
        {otherProfiles.map((item) => (
          <MiniProfileCard key={item.id} profile={item} onOpen={onSelectProfile} />
        ))}
      </aside>
    </main>
  );
}

function ProfileField({ label, placeholder, icon, type = "text", value, onChange }) {
  if (type === "period") {
    return <TimePeriodField label={label} value={value} onChange={onChange} />;
  }

  if (type === "month") {
    return <MonthField label={label} value={value} onChange={onChange} />;
  }

  if (type === "year") {
    return <YearField label={label} placeholder={placeholder} value={value} onChange={onChange} />;
  }

  if (type === "textarea") {
    return <DescriptionEditorField label={label} placeholder={placeholder} value={value} onChange={onChange} />;
  }

  return (
    <label className="profile-field">
      <span className="profile-label">{label}</span>
      <span className="input-shell">
        {icon ? <Icon name={icon} /> : null}
        <input value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
        {icon === "calendar" ? <Icon name="calendar" /> : null}
      </span>
    </label>
  );
}

function openMonthPicker(input) {
  if (!input) {
    return;
  }

  input.focus();

  if (input.showPicker) {
    input.showPicker();
    return;
  }

  input.click();
}

function isMonthInputValue(value) {
  return typeof value === "string" && /^\d{4}-\d{2}$/.test(value);
}

function isYearInputValue(value) {
  return typeof value === "string" && /^\d{4}$/.test(value.trim());
}

function formatMonthInput(value) {
  if (!isMonthInputValue(value)) {
    return "";
  }

  const [year, month] = value.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
}

function YearField({ label, placeholder, value, onChange }) {
  return (
    <label className="profile-field">
      <span className="profile-label">{label}</span>
      <span className="input-shell">
        <input
          value={value}
          placeholder={placeholder}
          inputMode="numeric"
          maxLength={4}
          pattern="\d{4}"
          onChange={(event) => onChange(event.target.value.replace(/\D/g, "").slice(0, 4))}
        />
      </span>
    </label>
  );
}

function MonthField({ label, value, onChange }) {
  const monthRef = useRef(null);
  const displayValue = formatMonthInput(value);
  const inputValue = isMonthInputValue(value) ? value : "";

  return (
    <div className="profile-field">
      <span className="profile-label">{label}</span>
      <div className="input-shell month-shell">
        <input
          ref={monthRef}
          className="month-native-input"
          aria-label={`${label} month and year`}
          type="month"
          value={inputValue}
          onChange={(event) => onChange(event.target.value)}
        />
        <button
          className="month-picker-button"
          type="button"
          aria-label={`Choose ${label} month and year`}
          onClick={() => openMonthPicker(monthRef.current)}
        >
          <CalendarIcon />
        </button>
        {displayValue ? <span className="month-display">{displayValue}</span> : null}
      </div>
    </div>
  );
}

function TimePeriodField({ label, value, onChange }) {
  const startMonthRef = useRef(null);
  const endMonthRef = useRef(null);
  const periodValue = value || { start: "", end: "" };
  const startInputValue = isMonthInputValue(periodValue.start) ? periodValue.start : "";
  const endInputValue = isMonthInputValue(periodValue.end) ? periodValue.end : "";
  const startDisplayValue = formatMonthInput(periodValue.start);
  const endDisplayValue = formatMonthInput(periodValue.end);

  return (
    <div className="profile-field">
      <span className="profile-label">{label}</span>
      <div className="input-shell period-shell">
        <span className="month-picker-control">
          <input
            ref={startMonthRef}
            className="month-native-input"
            aria-label={`${label} start month and year`}
            type="month"
            value={startInputValue}
            onChange={(event) => onChange({ ...periodValue, start: event.target.value })}
          />
          <button
            className="month-picker-button"
            type="button"
            aria-label={`Choose ${label} start month and year`}
            onClick={() => openMonthPicker(startMonthRef.current)}
          >
            <CalendarIcon />
          </button>
          {startDisplayValue ? <span className="month-display">{startDisplayValue}</span> : null}
        </span>
        <span className="period-separator">-</span>
        <span className="month-picker-control">
          <input
            ref={endMonthRef}
            className="month-native-input"
            aria-label={`${label} end month and year`}
            type="month"
            value={endInputValue}
            onChange={(event) => onChange({ ...periodValue, end: event.target.value })}
          />
          <button
            className="month-picker-button"
            type="button"
            aria-label={`Choose ${label} end month and year`}
            onClick={() => openMonthPicker(endMonthRef.current)}
          >
            <CalendarIcon />
          </button>
          {endDisplayValue ? <span className="month-display">{endDisplayValue}</span> : null}
        </span>
      </div>
    </div>
  );
}

function ProgramSelect({ value, onChange }) {
  return (
    <label className="profile-field">
      <span className="profile-label">Program</span>
      <span className="input-shell native-select-shell">
        <Icon name="cap" />
        <select value={value} onChange={(event) => onChange(event.target.value)}>
          <option value="">Select your program</option>
          {programOptions.map((program) => (
            <option key={program} value={program}>
              {program}
            </option>
          ))}
        </select>
        <DownArrow />
      </span>
    </label>
  );
}

function NativeSelectButton({ label, value, onChange, options, placeholder, className = "" }) {
  return (
    <label className={`profile-field ${className}`}>
      <span className="profile-label">{label}</span>
      <span className="input-shell native-select-shell">
        <select value={value} onChange={(event) => onChange(event.target.value)}>
          <option value="">{placeholder}</option>
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <DownArrow />
      </span>
    </label>
  );
}

function SpecialisationPicker({ majorValue, minorValue, onMajorChange, onMinorChange }) {
  const [firstType, setFirstType] = useState("Major");
  const [secondType, setSecondType] = useState("Minor");

  function updateType(row, nextType) {
    const otherType = nextType === "Major" ? "Minor" : "Major";

    if (row === "first") {
      setFirstType(nextType);
      if (secondType === nextType) {
        setSecondType(otherType);
      }
      return;
    }

    setSecondType(nextType);
    if (firstType === nextType) {
      setFirstType(otherType);
    }
  }

  function getDomainValue(type) {
    return type === "Major" ? majorValue : minorValue;
  }

  function updateDomain(type, value) {
    if (type === "Major") {
      onMajorChange(value);
      return;
    }

    onMinorChange(value);
  }

  return (
    <div className="specialisation-picker">
      <div className="specialisation-grid" role="group" aria-label="Specialisation choices">
        <NativeSelectButton
          label="Specialisation"
          value={firstType}
          onChange={(value) => updateType("first", value)}
          options={["Major", "Minor"]}
          placeholder="Select type"
        />
        <NativeSelectButton
          label="Domain"
          value={getDomainValue(firstType)}
          onChange={(value) => updateDomain(firstType, value)}
          options={specialisationOptions}
          placeholder="Select domain"
        />
        <NativeSelectButton
          label=""
          value={secondType}
          onChange={(value) => updateType("second", value)}
          options={["Major", "Minor"]}
          placeholder="Select type"
          className="specialisation-type-field"
        />
        <NativeSelectButton
          label=""
          value={getDomainValue(secondType)}
          onChange={(value) => updateDomain(secondType, value)}
          options={specialisationOptions}
          placeholder="Select domain"
          className="specialisation-domain-field"
        />
      </div>
    </div>
  );
}

function HelpMultiSelect({ value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const selectedOptions = value || [];

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    function handlePointerDown(event) {
      if (!dropdownRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  function toggleOption(option) {
    onChange(
      selectedOptions.includes(option)
        ? selectedOptions.filter((item) => item !== option)
        : [...selectedOptions, option]
    );
  }

  const label = selectedOptions.length > 0 ? selectedOptions.join(", ") : "Select help area";

  return (
    <div className="profile-field dropdown-anchor" ref={dropdownRef}>
      <span className="profile-label">Can Help With</span>
      <button
        className={`input-shell select-shell ${isOpen ? "is-open" : ""}`}
        type="button"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
      >
        <span className={selectedOptions.length > 0 ? "selected-help-text" : "placeholder-text"}>
          {label}
        </span>
        <DownArrow className={`dropdown-caret ${isOpen ? "is-open" : ""}`} />
      </button>

      {isOpen ? (
        <div className="mock-dropdown" role="listbox" aria-multiselectable="true">
          {helpOptions.map((option) => {
            const isSelected = selectedOptions.includes(option);

            return (
              <button
                key={option}
                className={isSelected ? "is-selected" : ""}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => toggleOption(option)}
              >
                {option}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function UploadPhotoBox({ fileName, photoUrl, onFileChange, adjustments, onAdjustmentsChange, canAdjust }) {
  const inputRef = useRef(null);
  const dragStateRef = useRef(null);
  const suppressClickRef = useRef(false);
  const [isDraggingPhoto, setIsDraggingPhoto] = useState(false);
  const zoom = adjustments?.zoom || DEFAULT_PHOTO_ADJUSTMENTS.zoom;
  const rotation = adjustments?.rotation || DEFAULT_PHOTO_ADJUSTMENTS.rotation;
  const offsetX = adjustments?.offsetX || DEFAULT_PHOTO_ADJUSTMENTS.offsetX;
  const offsetY = adjustments?.offsetY || DEFAULT_PHOTO_ADJUSTMENTS.offsetY;
  const previewStyle = canAdjust
    ? { transform: `translate(${offsetX * 100}%, ${offsetY * 100}%) rotate(${rotation}deg) scale(${zoom})` }
    : undefined;

  function updateAdjustments(nextValues) {
    const nextZoom = nextValues.zoom ?? zoom;
    const nextRotation = nextValues.rotation ?? rotation;
    const nextOffsetX = nextValues.offsetX ?? offsetX;
    const nextOffsetY = nextValues.offsetY ?? offsetY;

    onAdjustmentsChange({
      zoom: nextZoom,
      rotation: nextRotation,
      offsetX: clampPhotoOffset(nextOffsetX, nextZoom),
      offsetY: clampPhotoOffset(nextOffsetY, nextZoom)
    });
  }

  function handlePhotoClick(event) {
    if (suppressClickRef.current) {
      event.preventDefault();
      suppressClickRef.current = false;
      return;
    }

    inputRef.current?.click();
  }

  function handlePhotoPointerDown(event) {
    if (!canAdjust) {
      return;
    }

    const frame = event.currentTarget.getBoundingClientRect();
    dragStateRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      offsetX,
      offsetY,
      frameSize: Math.max(1, Math.min(frame.width, frame.height)),
      didDrag: false
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsDraggingPhoto(true);
  }

  function handlePhotoPointerMove(event) {
    const dragState = dragStateRef.current;

    if (!dragState) {
      return;
    }

    const deltaX = event.clientX - dragState.startX;
    const deltaY = event.clientY - dragState.startY;

    if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) {
      dragState.didDrag = true;
      suppressClickRef.current = true;
    }

    onAdjustmentsChange({
      zoom,
      rotation,
      offsetX: clampPhotoOffset(dragState.offsetX + (deltaX / dragState.frameSize), zoom),
      offsetY: clampPhotoOffset(dragState.offsetY + (deltaY / dragState.frameSize), zoom)
    });
  }

  function handlePhotoPointerEnd(event) {
    if (dragStateRef.current && event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    dragStateRef.current = null;
    setIsDraggingPhoto(false);
  }

  return (
    <div className="photo-upload-wrap">
      <button
        className={`photo-upload ${canAdjust ? "is-adjustable" : ""} ${isDraggingPhoto ? "is-dragging" : ""}`}
        type="button"
        onClick={handlePhotoClick}
        onPointerDown={handlePhotoPointerDown}
        onPointerMove={handlePhotoPointerMove}
        onPointerUp={handlePhotoPointerEnd}
        onPointerCancel={handlePhotoPointerEnd}
      >
        {photoUrl ? (
          <img className="photo-upload-preview" src={photoUrl} alt="Current profile" style={previewStyle} />
        ) : (
          <span className="camera-circle"><Icon name="camera" /></span>
        )}
        <strong>{fileName || (photoUrl ? "Change Photo" : "Upload Photo")}</strong>
        <span>{photoUrl ? (canAdjust ? "Drag to adjust" : "Click to replace") : "JPG, PNG, WebP up to 10MB"}</span>
      </button>
      <input
        ref={inputRef}
        className="sr-only"
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={(event) => onFileChange(event.target.files?.[0] || null)}
      />
      {canAdjust ? (
        <div className="photo-adjust-panel" aria-label="Photo adjustment controls">
          <label className="photo-adjust-slider">
            <span>Zoom <strong>{Math.round(zoom * 100)}%</strong></span>
            <input
              type="range"
              min="1"
              max="3"
              step="0.05"
              value={zoom}
              onChange={(event) => {
                const nextZoom = Number(event.target.value);
                updateAdjustments({
                  zoom: nextZoom,
                  offsetX: clampPhotoOffset(offsetX, nextZoom),
                  offsetY: clampPhotoOffset(offsetY, nextZoom)
                });
              }}
            />
          </label>
          <div className="photo-adjust-row">
            <span>Rotate</span>
            <button type="button" onClick={() => updateAdjustments({ rotation: rotation - 90 })}>-90</button>
            <button type="button" onClick={() => updateAdjustments({ rotation: rotation + 90 })}>+90</button>
            <button type="button" onClick={() => onAdjustmentsChange(DEFAULT_PHOTO_ADJUSTMENTS)}>Reset</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function PersonalInformation({
  personal,
  photoFile,
  photoAdjustments,
  onPersonalChange,
  onHelpChange,
  onPhotoChange,
  onPhotoAdjustmentsChange
}) {
  const [selectedPhotoUrl, setSelectedPhotoUrl] = useState("");

  useEffect(() => {
    if (!photoFile) {
      setSelectedPhotoUrl("");
      return undefined;
    }

    const objectUrl = URL.createObjectURL(photoFile);
    setSelectedPhotoUrl(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [photoFile]);

  const previewPhotoUrl = selectedPhotoUrl || personal.profile_photo_url;

  return (
    <section className="profile-card personal-card" aria-labelledby="personal-title">
      <div className="section-title">
        <h2 id="personal-title">1. Personal Information</h2>
      </div>

      <div className="personal-grid">
        <UploadPhotoBox
          fileName={photoFile?.name}
          photoUrl={previewPhotoUrl}
          adjustments={photoAdjustments}
          canAdjust={Boolean(photoFile)}
          onFileChange={onPhotoChange}
          onAdjustmentsChange={onPhotoAdjustmentsChange}
        />
        <ProfileField
          label="Full Name"
          placeholder="Enter your full name"
          value={personal.full_name}
          onChange={(value) => onPersonalChange("full_name", value)}
        />
        <ProfileField
          label="Email Address"
          placeholder="you@example.com"
          value={personal.email}
          onChange={(value) => onPersonalChange("email", value)}
        />
        <ProfileField
          label="LinkedIn Profile"
          placeholder="https://linkedin.com/in/yourprofile"
          icon="linkedin"
          value={personal.linkedin_url}
          onChange={(value) => onPersonalChange("linkedin_url", value)}
        />
        <ProfileField
          label="Contact Number"
          placeholder="+91 98765 43210"
          icon="phone"
          value={personal.contact_number}
          onChange={(value) => onPersonalChange("contact_number", value)}
        />
        <ProgramSelect value={personal.program} onChange={(value) => onPersonalChange("program", value)} />
        <HelpMultiSelect value={personal.can_help_with} onChange={onHelpChange} />
        <SpecialisationPicker
          majorValue={personal.major_specialisation}
          minorValue={personal.minor_specialisation}
          onMajorChange={(value) => onPersonalChange("major_specialisation", value)}
          onMinorChange={(value) => onPersonalChange("minor_specialisation", value)}
        />
      </div>
    </section>
  );
}

function DynamicSection({ section, rows, onFieldChange, onAddRow, onRemoveRow }) {
  return (
    <section className="profile-card" aria-labelledby={`${section.id}-title`}>
      <div className="section-title">
        <h2 id={`${section.id}-title`}>{section.number}. {section.title}</h2>
      </div>

      {rows.map((row, rowIndex) => (
        <div className={`section-fields fields-${section.fields.length}`} key={`${section.id}-row-${rowIndex}`}>
          {section.fields.map((field) => (
            <ProfileField
              key={`${section.id}-${rowIndex}-${field.name}`}
              {...field}
              value={row[field.name]}
              onChange={(value) => onFieldChange(section.id, rowIndex, field.name, value)}
            />
          ))}
          <button
            className="delete-row-button"
            type="button"
            aria-label={`Remove ${section.title} row ${rowIndex + 1}`}
            disabled={rows.length === 1}
            onClick={() => onRemoveRow(section.id, rowIndex)}
          >
            <Icon name="trash" />
          </button>
        </div>
      ))}

      <button className="profile-add-button" type="button" onClick={() => onAddRow(section.id)}>
        <Icon name="plus" /> Add More
      </button>
    </section>
  );
}

function ActionBar({ isSaving, statusMessage, onSave }) {
  return (
    <footer className="profile-actions">
      {statusMessage ? <p className="save-status">{statusMessage}</p> : null}
      <button className="save-button" type="button" disabled={isSaving} onClick={onSave}>
        {isSaving ? "Saving..." : "Save Profile"}
      </button>
    </footer>
  );
}

function ProfileFormPage({ user, onSaved, onLogout, onNavigate }) {
  const [personal, setPersonal] = useState({
    full_name: user?.user_metadata?.full_name || "",
    email: user?.email || "",
    linkedin_url: "",
    contact_number: "",
    program: "",
    major_specialisation: "",
    minor_specialisation: "",
    can_help_with: [],
    profile_photo_url: ""
  });
  const [sectionRows, setSectionRows] = useState(createEmptySectionRows);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoAdjustments, setPhotoAdjustments] = useState(DEFAULT_PHOTO_ADJUSTMENTS);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    if (!user || USE_TEMP_PROFILE_EDITOR) {
      return;
    }

    async function loadProfile() {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        setStatusMessage(error.message);
        return;
      }

      if (!data) {
        return;
      }

      setPersonal({
        full_name: data.full_name || user.user_metadata?.full_name || "",
        email: data.email || user.email || "",
        linkedin_url: data.linkedin_url || "",
        contact_number: data.contact_number || "",
        program: data.program || "",
        major_specialisation: data.major_specialisation || "",
        minor_specialisation: data.minor_specialisation || "",
        can_help_with: data.can_help_with || [],
        profile_photo_url: data.profile_photo_url || ""
      });

      setSectionRows(
        Object.fromEntries(
          sections.map((section) => {
            const rows = Array.isArray(data[section.id]) && data[section.id].length > 0
              ? data[section.id]
              : [createEmptyRow(section)];
            return [section.id, rows];
          })
        )
      );
    }

    loadProfile();
  }, [user]);

  function updatePersonal(key, value) {
    setPersonal((current) => ({ ...current, [key]: value }));
  }

  function updateSectionField(sectionId, rowIndex, fieldName, value) {
    setSectionRows((current) => ({
      ...current,
      [sectionId]: current[sectionId].map((row, index) =>
        index === rowIndex ? { ...row, [fieldName]: value } : row
      )
    }));
  }

  function addRow(sectionId) {
    const section = sections.find((item) => item.id === sectionId);

    setSectionRows((current) => ({
      ...current,
      [sectionId]: [...current[sectionId], createEmptyRow(section)]
    }));
  }

  function removeRow(sectionId, rowIndex) {
    setSectionRows((current) => ({
      ...current,
      [sectionId]: current[sectionId].length === 1
        ? current[sectionId]
        : current[sectionId].filter((_, index) => index !== rowIndex)
    }));
  }

  function handlePhotoChange(file) {
    if (!file) {
      setPhotoFile(null);
      setPhotoAdjustments(DEFAULT_PHOTO_ADJUSTMENTS);
      return;
    }

    if (!PROFILE_PHOTO_ALLOWED_TYPES.includes(file.type)) {
      setPhotoFile(null);
      setPhotoAdjustments(DEFAULT_PHOTO_ADJUSTMENTS);
      setStatusMessage("Profile photo must be a JPG, PNG, or WebP image.");
      return;
    }

    if (file.size > PROFILE_PHOTO_SOURCE_MAX_BYTES) {
      setPhotoFile(null);
      setPhotoAdjustments(DEFAULT_PHOTO_ADJUSTMENTS);
      setStatusMessage("Profile photo must be 10MB or smaller.");
      return;
    }

    setStatusMessage("");
    setPhotoAdjustments(DEFAULT_PHOTO_ADJUSTMENTS);
    setPhotoFile(file);
  }

  async function uploadPhotoIfNeeded() {
    if (USE_TEMP_PROFILE_EDITOR) {
      return personal.profile_photo_url || null;
    }

    if (!photoFile) {
      return personal.profile_photo_url || null;
    }

    if (!PROFILE_PHOTO_ALLOWED_TYPES.includes(photoFile.type)) {
      throw new Error("Profile photo must be a JPG, PNG, or WebP image.");
    }

    if (photoFile.size > PROFILE_PHOTO_SOURCE_MAX_BYTES) {
      throw new Error("Profile photo must be 10MB or smaller.");
    }

    const compressedPhoto = await compressProfilePhoto(photoFile, photoAdjustments);
    const filePath = `${user.id}/${PROFILE_PHOTO_OUTPUT_NAME}`;
    const { error } = await supabase.storage
      .from("profile-photos")
      .upload(filePath, compressedPhoto, { contentType: compressedPhoto.type, upsert: true });

    if (error) {
      throw error;
    }

    const { data } = supabase.storage.from("profile-photos").getPublicUrl(filePath);
    return data.publicUrl;
  }

  async function saveProfile() {
    if (!user) {
      setStatusMessage("Please sign in first.");
      return;
    }

    if (USE_TEMP_PROFILE_EDITOR) {
      setStatusMessage("Preview saved locally. Google sign-in will be connected later.");
      return;
    }

    setIsSaving(true);
    setStatusMessage("");

    try {
      const profilePhotoUrl = await uploadPhotoIfNeeded();
      const majorSpecialisation = personal.major_specialisation || null;
      const minorSpecialisation = personal.minor_specialisation || null;
      const payload = {
        id: user.id,
        full_name: personal.full_name.trim() || null,
        email: personal.email.trim() || user.email,
        linkedin_url: personal.linkedin_url.trim() || null,
        contact_number: personal.contact_number.trim() || null,
        program: personal.program || null,
        major_specialisation: majorSpecialisation,
        minor_specialisation: minorSpecialisation,
        can_help_with: personal.can_help_with,
        profile_photo_url: profilePhotoUrl,
        is_private: false,
        show_in_directory: true,
        ...Object.fromEntries(sections.map((section) => [section.id, cleanRows(sectionRows[section.id])]))
      };

      const { error } = await supabase.from("profiles").upsert(payload);

      if (error) {
        throw error;
      }

      setPersonal((current) => ({ ...current, profile_photo_url: profilePhotoUrl || "" }));
      setStatusMessage("Profile saved.");
      onSaved();
    } catch (error) {
      setStatusMessage(error.message || "Unable to save profile.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="profile-page-shell">
      <DirectoryHeader
        user={user}
        onLogin={() => {}}
        onLogout={onLogout}
        onNavigate={onNavigate}
        showFilters={false}
      />
      <main className="profile-builder" aria-label="Create profile form">
        <PersonalInformation
          personal={personal}
          photoFile={photoFile}
          photoAdjustments={photoAdjustments}
          onPersonalChange={updatePersonal}
          onHelpChange={(value) => updatePersonal("can_help_with", value)}
          onPhotoChange={handlePhotoChange}
          onPhotoAdjustmentsChange={setPhotoAdjustments}
        />
        {sections.map((section) => (
          <DynamicSection
            key={section.id}
            section={section}
            rows={sectionRows[section.id]}
            onFieldChange={updateSectionField}
            onAddRow={addRow}
            onRemoveRow={removeRow}
          />
        ))}
        <ActionBar isSaving={isSaving} statusMessage={statusMessage} onSave={saveProfile} />
      </main>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(USE_TEMP_PROFILE_EDITOR ? TEMP_PROFILE_USER : null);
  const userRef = useRef(user);
  const [view, setView] = useState("directory");
  const [authMessage, setAuthMessage] = useState("");
  const [directoryProfiles, setDirectoryProfiles] = useState([]);
  const [directoryFilters, setDirectoryFilters] = useState({
    search: "",
    batch: "",
    specialisation: "",
    canHelpWith: ""
  });
  const [isDirectoryLoading, setIsDirectoryLoading] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const hasActiveDirectoryFilters = Object.values(directoryFilters).some((value) => value.trim() !== "");
  const visibleProfiles = directoryProfiles.filter((profile) => profileMatchesFilters(profile, directoryFilters));

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    updateBrowserHistory("directory", { replace: true });

    function handlePopState(event) {
      const nextView = event.state?.insideMbaView || "directory";

      if (nextView === "profile" && userRef.current) {
        setSelectedProfile(null);
        setView("profile");
        return;
      }

      setSelectedProfile(null);
      setView("directory");
    }

    window.addEventListener("popstate", handlePopState);

    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    if (USE_TEMP_PROFILE_EDITOR) {
      return undefined;
    }

    supabase.auth.getSession().then(({ data }) => {
      const sessionUser = data.session?.user || null;
      if (sessionUser && isGreatLakesEmail(sessionUser.email)) {
        setUser(sessionUser);
      } else if (sessionUser) {
        supabase.auth.signOut();
        setAuthMessage(`Please sign in with your @${GREAT_LAKES_DOMAIN} email.`);
      }
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      const sessionUser = session?.user || null;

      if (!sessionUser) {
        setUser(null);
        setSelectedProfile(null);
        setDirectoryProfiles([]);
        setDirectoryFilters({ search: "", batch: "", specialisation: "", canHelpWith: "" });
        return;
      }

      if (!isGreatLakesEmail(sessionUser.email)) {
        supabase.auth.signOut();
        setAuthMessage(`Please sign in with your @${GREAT_LAKES_DOMAIN} email.`);
        return;
      }

      setAuthMessage("");
      setUser(sessionUser);
      if (event === "SIGNED_IN") {
        updateBrowserHistory("directory", { replace: true });
        setView("directory");
      }
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (USE_TEMP_PROFILE_EDITOR) {
      return;
    }

    if (!user) {
      setDirectoryProfiles([]);
      setIsDirectoryLoading(false);
      return;
    }

    async function loadDirectoryProfiles() {
      setIsDirectoryLoading(true);
      const { data, error } = await supabase
        .from("profiles")
        .select(directoryProfileSelect)
        .eq("show_in_directory", true)
        .eq("is_private", false);

      if (!error) {
        setDirectoryProfiles(data || []);
      }

      setIsDirectoryLoading(false);
    }

    loadDirectoryProfiles();
  }, [user]);

  async function handleLogin() {
    if (USE_TEMP_PROFILE_EDITOR) {
      setAuthMessage("");
      setUser(TEMP_PROFILE_USER);
      setView("directory");
      return;
    }

    setAuthMessage("");
    updateBrowserHistory("directory", { replace: true });
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
        queryParams: {
          hd: GREAT_LAKES_DOMAIN,
          prompt: "select_account"
        }
      }
    });

    if (error) {
      setAuthMessage(error.message);
    }
  }

  async function handleLogout() {
    if (USE_TEMP_PROFILE_EDITOR) {
      setUser(TEMP_PROFILE_USER);
      setView("directory");
      return;
    }

    await supabase.auth.signOut();
    setUser(null);
    setSelectedProfile(null);
    setDirectoryProfiles([]);
    setDirectoryFilters({ search: "", batch: "", specialisation: "", canHelpWith: "" });
    updateBrowserHistory("directory", { replace: true });
    setView("directory");
  }

  function handleDirectoryFilterChange(key, value) {
    setDirectoryFilters((current) => ({ ...current, [key]: value }));
  }

  function handleNavigate(nextView) {
    if (nextView === "directory") {
      setSelectedProfile(null);
    }

    updateBrowserHistory(nextView);
    setView(nextView);
  }

  function handleProfileSaved() {
    setSelectedProfile(null);
    updateBrowserHistory("directory", { replace: true });
    setView("directory");
    supabase
      .from("profiles")
      .select(directoryProfileSelect)
      .eq("show_in_directory", true)
      .eq("is_private", false)
      .then(({ data }) => setDirectoryProfiles(data || []));
  }

  async function handleOpenProfile(profile) {
    setAuthMessage("");

    if (USE_TEMP_PROFILE_EDITOR || profile.id?.startsWith("sample-")) {
      updateBrowserHistory("detail");
      setSelectedProfile(profile);
      return;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", profile.id)
      .maybeSingle();

    if (error) {
      setAuthMessage(error.message);
      updateBrowserHistory("detail");
      setSelectedProfile(profile);
      return;
    }

    updateBrowserHistory("detail");
    setSelectedProfile(data || profile);
  }

  function handleCloseProfileDetail() {
    setSelectedProfile(null);
    updateBrowserHistory("directory", { replace: true });
  }

  if (view === "profile") {
    return user ? (
      <ProfileFormPage
        user={user}
        onSaved={handleProfileSaved}
        onLogout={handleLogout}
        onNavigate={handleNavigate}
      />
    ) : (
      <div className="app-shell">
        <DirectoryHeader
          user={user}
          onLogin={handleLogin}
          onLogout={handleLogout}
          onNavigate={handleNavigate}
          filters={directoryFilters}
          onFiltersChange={handleDirectoryFilterChange}
        />
        <DirectoryScreen
          user={user}
          directoryProfiles={visibleProfiles}
          isLoading={isDirectoryLoading}
          hasActiveFilters={hasActiveDirectoryFilters}
          onOpenProfile={handleOpenProfile}
        />
      </div>
    );
  }

  return (
    <div className="app-shell">
      <DirectoryHeader
        user={user}
        onLogin={handleLogin}
        onLogout={handleLogout}
        onNavigate={handleNavigate}
        filters={directoryFilters}
        onFiltersChange={handleDirectoryFilterChange}
      />
      {authMessage ? <div className="auth-message">{authMessage}</div> : null}
      {selectedProfile ? (
        <DetailedProfileView
          profile={selectedProfile}
          profiles={visibleProfiles}
          onSelectProfile={handleOpenProfile}
          onClose={handleCloseProfileDetail}
        />
      ) : (
        <DirectoryScreen
          user={user}
          directoryProfiles={visibleProfiles}
          isLoading={isDirectoryLoading}
          hasActiveFilters={hasActiveDirectoryFilters}
          onOpenProfile={handleOpenProfile}
        />
      )}
    </div>
  );
}
