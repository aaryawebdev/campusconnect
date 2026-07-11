import { useEffect, useRef, useState } from "react";
import { supabase } from "./supabaseClient";

const GREAT_LAKES_DOMAIN = "greatlakes.edu.in";

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
      { name: "description", label: "Work Done / Description", placeholder: "Describe your key responsibilities and impact" }
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
      { name: "description", label: "Work Done / Description", placeholder: "Describe your key responsibilities and impact" }
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
      { name: "year", label: "Year", placeholder: "Select year", icon: "calendar" }
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
      { name: "description", label: "Description", placeholder: "Describe the project and outcomes" }
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
      { name: "year", label: "Year", placeholder: "Select year", icon: "calendar" },
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
      { name: "year", label: "Year", placeholder: "Select year", icon: "calendar" },
      { name: "description_rank", label: "Description / Rank", placeholder: "Enter description or rank" }
    ]
  }
];

const helpOptions = ["Case Competitions", "Interview Prep", "GDPI Prep"];
const programOptions = ["PGDM 27", "PGDM 28", "PGCM 27"];

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
  return rows.filter((row) => Object.values(row).some((value) => !isBlankValue(value)));
}

function getFirstName(user) {
  const displayName = user?.user_metadata?.full_name || user?.email || "User";
  return displayName.split(" ")[0].split("@")[0];
}

function isGreatLakesEmail(email) {
  return email?.toLowerCase().endsWith(`@${GREAT_LAKES_DOMAIN}`);
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

function DirectoryHeader({ user, onLogin, onLogout, onNavigate }) {
  return (
    <header className="topbar" aria-label="GLIMCONNECT header">
      <button className="brand" type="button" onClick={() => onNavigate("directory")}>
        GLIMCONNECT
      </button>

      <div className="filters" aria-label="Directory filters">
        <label className="field field-search">
          <span className="sr-only">Search</span>
          <input type="search" placeholder="Search by name, company, role, or domain" />
        </label>

        <label className="field field-small">
          <span className="sr-only">Batch</span>
          <select defaultValue="Batch">
            <option>Batch</option>
          </select>
        </label>

        <label className="field field-small">
          <span className="sr-only">Specialisation</span>
          <select defaultValue="Specialisation">
            <option>Specialisation</option>
          </select>
        </label>

        <label className="field field-help">
          <span className="sr-only">Can Help With</span>
          <select defaultValue="Can Help With">
            <option>Can Help With</option>
          </select>
        </label>
      </div>

      {user ? (
        <div className="account-preview">
          <button className="login-button account-button" type="button">
            Hello {getFirstName(user)}
          </button>
          <div className="account-menu" aria-label="Account menu">
            <button type="button" onClick={() => onNavigate("profile")}>
              Profile
            </button>
            <button type="button" onClick={onLogout}>
              Logout
            </button>
          </div>
        </div>
      ) : (
        <button className="login-button" type="button" onClick={onLogin}>
          Sign in with Google
        </button>
      )}
    </header>
  );
}

function CreateProfileHeader() {
  return (
    <header className="profile-topbar">
      <div className="profile-brand">
        <div className="google-mark"><Icon name="google" /></div>
        <button className="profile-logo" type="button">GLIM<span>CONNECT</span></button>
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

function DirectoryScreen({ directoryProfiles, isLoading }) {
  return (
    <main className="directory-canvas" aria-label="Directory">
      <section className="empty-directory" aria-label="Directory state">
        {isLoading ? (
          <p>Loading profiles...</p>
        ) : directoryProfiles.length > 0 ? (
          <p>{directoryProfiles.length} profile{directoryProfiles.length === 1 ? "" : "s"} saved in directory.</p>
        ) : (
          <p>Profiles will appear here after students add their information.</p>
        )}
      </section>
    </main>
  );
}

function ProfileField({ label, placeholder, icon, type = "text", value, onChange }) {
  if (type === "period") {
    return <TimePeriodField label={label} value={value} onChange={onChange} />;
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

function TimePeriodField({ label, value, onChange }) {
  const startDateRef = useRef(null);
  const periodValue = value || { start: "", end: "" };

  function openStartPicker(event) {
    if (event.target.tagName === "INPUT") {
      return;
    }

    if (startDateRef.current?.showPicker) {
      startDateRef.current.showPicker();
      return;
    }

    startDateRef.current?.focus();
  }

  return (
    <div className="profile-field">
      <span className="profile-label">{label}</span>
      <div className="input-shell period-shell" onClick={openStartPicker}>
        <Icon name="calendar" />
        <input
          ref={startDateRef}
          aria-label={`${label} start date`}
          type="date"
          value={periodValue.start}
          onChange={(event) => onChange({ ...periodValue, start: event.target.value })}
        />
        <span className="period-separator">-</span>
        <input
          aria-label={`${label} end date`}
          type="date"
          value={periodValue.end}
          onChange={(event) => onChange({ ...periodValue, end: event.target.value })}
        />
        <Icon name="calendar" />
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
        <span className="dropdown-caret" aria-hidden="true">v</span>
      </span>
    </label>
  );
}

function HelpMultiSelect({ value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOptions = value || [];

  function toggleOption(option) {
    onChange(
      selectedOptions.includes(option)
        ? selectedOptions.filter((item) => item !== option)
        : [...selectedOptions, option]
    );
  }

  const label = selectedOptions.length > 0 ? selectedOptions.join(", ") : "Select help area";

  return (
    <div className="profile-field dropdown-anchor">
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
        <span className="dropdown-caret" aria-hidden="true">{isOpen ? "^" : "v"}</span>
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

function UploadPhotoBox({ fileName, onFileChange }) {
  const inputRef = useRef(null);

  return (
    <div className="photo-upload-wrap">
      <button className="photo-upload" type="button" onClick={() => inputRef.current?.click()}>
        <span className="camera-circle"><Icon name="camera" /></span>
        <strong>{fileName || "Upload Photo"}</strong>
        <span>JPG, PNG up to 5MB</span>
      </button>
      <input
        ref={inputRef}
        className="sr-only"
        type="file"
        accept="image/png,image/jpeg"
        onChange={(event) => onFileChange(event.target.files?.[0] || null)}
      />
    </div>
  );
}

function PersonalInformation({ personal, photoFile, onPersonalChange, onHelpChange, onPhotoChange }) {
  return (
    <section className="profile-card personal-card" aria-labelledby="personal-title">
      <div className="section-title">
        <Icon name="user" />
        <h2 id="personal-title">1. Personal Information</h2>
      </div>

      <div className="personal-grid">
        <UploadPhotoBox fileName={photoFile?.name} onFileChange={onPhotoChange} />
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
      </div>
    </section>
  );
}

function DynamicSection({ section, rows, onFieldChange, onAddRow, onRemoveRow }) {
  return (
    <section className="profile-card" aria-labelledby={`${section.id}-title`}>
      <div className="section-title">
        <Icon name={section.icon} />
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
      <button className="preview-button" type="button">
        <Icon name="eye" /> Preview
      </button>
      <button className="save-button" type="button" disabled={isSaving} onClick={onSave}>
        <Icon name="lock" /> {isSaving ? "Saving..." : "Save Profile"}
      </button>
    </footer>
  );
}

function ProfileFormPage({ user, onSaved }) {
  const [personal, setPersonal] = useState({
    full_name: user?.user_metadata?.full_name || "",
    email: user?.email || "",
    linkedin_url: "",
    contact_number: "",
    program: "",
    can_help_with: [],
    profile_photo_url: ""
  });
  const [sectionRows, setSectionRows] = useState(createEmptySectionRows);
  const [photoFile, setPhotoFile] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    if (!user) {
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

  async function uploadPhotoIfNeeded() {
    if (!photoFile) {
      return personal.profile_photo_url || null;
    }

    const extension = photoFile.name.split(".").pop();
    const filePath = `${user.id}/profile.${extension}`;
    const { error } = await supabase.storage
      .from("profile-photos")
      .upload(filePath, photoFile, { upsert: true });

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

    setIsSaving(true);
    setStatusMessage("");

    try {
      const profilePhotoUrl = await uploadPhotoIfNeeded();
      const payload = {
        id: user.id,
        full_name: personal.full_name.trim() || null,
        email: personal.email.trim() || user.email,
        linkedin_url: personal.linkedin_url.trim() || null,
        contact_number: personal.contact_number.trim() || null,
        program: personal.program || null,
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
      <CreateProfileHeader />
      <main className="profile-builder" aria-label="Create profile form">
        <PersonalInformation
          personal={personal}
          photoFile={photoFile}
          onPersonalChange={updatePersonal}
          onHelpChange={(value) => updatePersonal("can_help_with", value)}
          onPhotoChange={setPhotoFile}
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
  const [user, setUser] = useState(null);
  const [view, setView] = useState("directory");
  const [authMessage, setAuthMessage] = useState("");
  const [directoryProfiles, setDirectoryProfiles] = useState([]);
  const [isDirectoryLoading, setIsDirectoryLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const sessionUser = data.session?.user || null;
      if (sessionUser && isGreatLakesEmail(sessionUser.email)) {
        setUser(sessionUser);
      } else if (sessionUser) {
        supabase.auth.signOut();
        setAuthMessage(`Please sign in with your @${GREAT_LAKES_DOMAIN} email.`);
      }
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      const sessionUser = session?.user || null;

      if (!sessionUser) {
        setUser(null);
        return;
      }

      if (!isGreatLakesEmail(sessionUser.email)) {
        supabase.auth.signOut();
        setAuthMessage(`Please sign in with your @${GREAT_LAKES_DOMAIN} email.`);
        return;
      }

      setAuthMessage("");
      setUser(sessionUser);
      setView("profile");
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    async function loadDirectoryProfiles() {
      setIsDirectoryLoading(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, program, can_help_with, profile_photo_url")
        .eq("show_in_directory", true)
        .eq("is_private", false);

      if (!error) {
        setDirectoryProfiles(data || []);
      }

      setIsDirectoryLoading(false);
    }

    loadDirectoryProfiles();
  }, []);

  async function handleLogin() {
    setAuthMessage("");
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
    await supabase.auth.signOut();
    setUser(null);
    setView("directory");
  }

  function handleProfileSaved() {
    setView("directory");
    supabase
      .from("profiles")
      .select("id, full_name, program, can_help_with, profile_photo_url")
      .eq("show_in_directory", true)
      .eq("is_private", false)
      .then(({ data }) => setDirectoryProfiles(data || []));
  }

  if (view === "profile") {
    return user ? (
      <ProfileFormPage user={user} onSaved={handleProfileSaved} />
    ) : (
      <div className="app-shell">
        <DirectoryHeader user={user} onLogin={handleLogin} onLogout={handleLogout} onNavigate={setView} />
        <DirectoryScreen directoryProfiles={directoryProfiles} isLoading={isDirectoryLoading} />
      </div>
    );
  }

  return (
    <div className="app-shell">
      <DirectoryHeader user={user} onLogin={handleLogin} onLogout={handleLogout} onNavigate={setView} />
      {authMessage ? <div className="auth-message">{authMessage}</div> : null}
      <DirectoryScreen directoryProfiles={directoryProfiles} isLoading={isDirectoryLoading} />
    </div>
  );
}
