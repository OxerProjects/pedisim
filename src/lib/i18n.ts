export const dictionaries = {
  en: {
    home: {
      title: "Simply practice.",
      subtitle: "Advanced Monitor Simulator",
      goToLogin: "Purchase",
    },
    login: {
      title: "Sign In",
      username: "Username",
      password: "Password",
      signIn: "Sign In",
      trainerLogin: "Trainer Login",
      monitorConnect: "Monitor Connect",
      roomCode: "Room Code",
      connect: "Connect",
    },
    dashboard: {
      trainerTitle: "Trainer Dashboard",
      adminTitle: "Admin Dashboard",
      manageUsers: "Manage Users",
      createNewUser: "Create New User",
      usersList: "Users List",
    },
    common: {
      save: "Save",
      cancel: "Cancel",
      language: "Language",
      hebrew: "עברית",
      english: "English",
      signOut: "Sign Out",
      login: "Login",
    }
  },
  he: {
    home: {
      title: "פשוט לתרגל.",
      subtitle: "סימולטור מוניטור מתקדם",
      goToLogin: "לרכישה",
    },
    login: {
      title: "התחברות",
      username: "שם משתמש",
      password: "סיסמה",
      signIn: "התחבר",
      trainerLogin: "התחברות למדריך",
      monitorConnect: "חיבור למוניטור",
      roomCode: "קוד חדר",
      connect: "התחבר",
    },
    dashboard: {
      trainerTitle: "מסך השליטה (Trainer Dashboard)",
      adminTitle: "מערכת ניהול (Admin)",
      manageUsers: "ניהול משתמשים",
      createNewUser: "צור משתמש חדש",
      usersList: "רשימת משתמשים",
    },
    common: {
      save: "שמור",
      cancel: "ביטול",
      language: "שפה",
      hebrew: "עברית",
      english: "English",
      signOut: "התנתק",
      login: "התחברות",
    }
  }
};

export type ResourceKeys = typeof dictionaries.en;
