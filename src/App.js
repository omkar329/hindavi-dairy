import React, { useState } from "react";

// ===== TELEGRAM CONFIG =====
const TELEGRAM_BOT_TOKEN = process.env.REACT_APP_TELEGRAM_BOT_TOKEN || "8985832159:AAGZy1qOX-qQ6YfhiBnlDm7MvsU_w88UjpE";

// ===== SAMPLE DATA =====
const initialAdmins = [
  { id: "admin", pass: "dairy123", name: "मुख्य व्यवस्थापक" }
];

const initialUsers = [
  { id: 1, name: "रामराव पाटील", mobile: "9876543210", telegramChatId: "123456789", village: "चिंचोली", type: "शेतकरी", joined: "2026-06-01" },
  { id: 2, name: "रिलायन्स अ‍ॅग्रो कंपनी", mobile: "9999988888", telegramChatId: "", village: "मुंबई", type: "कंपनी", joined: "2026-06-02" }
];

const initialCollections = [
  { id: 1, userId: 1, userName: "रामराव पाटील", date: "2026-06-01", session: "सकाळ", litres: 10, fat: 4.0, smf: 8.5, rate: 35, amount: 350 },
  { id: 2, userId: 1, userName: "रामराव पाटील", date: "2026-06-01", session: "संध्याकाळ", litres: 8, fat: 4.2, smf: 8.6, rate: 36, amount: 288 },
  { id: 3, userId: 2, userName: "रिलायन्स अ‍ॅग्रो कंपनी", date: "2026-06-02", session: "सकाळ", litres: 500, fat: 4.5, smf: 8.8, rate: 40, amount: 20000 }
];

export default function HindaviDairy() {
  const [page, setPage] = useState("login"); 
  const [currentUser, setCurrentUser] = useState(null);
  
  // State Lists
  const [adminsList, setAdminsList] = useState(initialAdmins);
  const [users, setUsers] = useState(initialUsers);
  const [collections, setCollections] = useState(initialCollections);
  
  const [adminTab, setAdminTab] = useState("dashboard");
  const [loginRole, setLoginRole] = useState("admin"); 
  
  // Login form states
  const [loginId, setLoginId] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [loginError, setLoginError] = useState("");

  // Form setup states
  const [newAdminSetup, setNewAdminSetup] = useState({ id: "", pass: "", name: "" });
  const [newCollection, setNewCollection] = useState({ userId: "", session: "सकाळ", litres: "", fat: "", smf: "", rate: "" });
  const [newUser, setNewUser] = useState({ name: "", mobile: "", telegramChatId: "", village: "", type: "शेतकरी" });
  const [editingUser, setEditingUser] = useState(null);
  
  const [selectedFarmerReport, setSelectedFarmerReport] = useState("");
  const [searchFarmer, setSearchFarmer] = useState("");
  const [notification, setNotification] = useState(null);

  const showNotif = (msg, type = "success") => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const liveAmount = Math.round((parseFloat(newCollection.litres) || 0) * (parseFloat(newCollection.rate) || 0));

  const sendTelegramNotification = async (chatId, text) => {
    if (!TELEGRAM_BOT_TOKEN || TELEGRAM_BOT_TOKEN === "YOUR_BOT_TOKEN_HERE") return;
    try {
      const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
      await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text: text, parse_mode: "Markdown" })
      });
    } catch (error) {
      console.error("Telegram error:", error);
    }
  };

  const handleLogin = () => {
    if (loginRole === "admin") {
      const foundAdmin = adminsList.find(a => a.id === loginId && a.pass === loginPass);
      if (foundAdmin) {
        setCurrentUser({ role: "admin", name: foundAdmin.name, id: foundAdmin.id });
        setPage("admin");
        setLoginError("");
      } else {
        setLoginError("चुकीचा Admin ID किंवा पासवर्ड");
      }
    } else if (loginRole === "user") {
      const user = users.find(u => u.mobile === loginId);
      if (user && loginPass === "1234") {
        setCurrentUser({ role: "user", ...user });
        setPage("user");
        setLoginError("");
      } else {
        setLoginError("मोबाईल नंबर किंवा पासवर्ड चुकीचा");
      }
    }
  };

  const handleAddAdmin = () => {
    if (!newAdminSetup.id || !newAdminSetup.pass || !newAdminSetup.name) {
      showNotif("कृपया सर्व माहिती भरा", "error");
      return;
    }
    if (adminsList.some(a => a.id === newAdminSetup.id)) {
      showNotif("या ID चा Admin आधीपासूनच अस्तित्वात आहे!", "error");
      return;
    }
    setAdminsList([...adminsList, newAdminSetup]);
    showNotif(`नवीन Admin '${newAdminSetup.name}' यशस्वीरित्या जोडला!`);
    setNewAdminSetup({ id: "", pass: "", name: "" });
  };

  const handleAddCollection = () => {
    if (!newCollection.userId || !newCollection.litres || !newCollection.rate) {
      showNotif("शेतकरी/कंपनी, लिटर आणि दर भरणे अनिवार्य आहे", "error"); 
      return;
    }
    const user = users.find(u => u.id === newCollection.userId);
    const litres = parseFloat(newCollection.litres);
    const rate = parseFloat(newCollection.rate);
    const fat = parseFloat(newCollection.fat) || 0;
    const smf = parseFloat(newCollection.smf) || 0;
    const amount = Math.round(litres * rate);

    const coll = {
      id: collections.length + 1,
      userId: parseInt(newCollection.userId),
      userName: user.name,
      date: new Date().toISOString().split("T")[0],
      session: newCollection.session,
      litres, fat, smf, rate, amount,
    };
    setCollections([...collections, coll]);

    if (user && user.telegramChatId) {
      const receipt = `🥛 *दूध संकलन पावती - हिंदवी डेअरी* \n\nदिनांक: ${coll.date} (${coll.session})\nग्राहक/कंपनी: ${coll.userName}\nदूध: ${coll.litres} लि.\nफॅट: ${coll.fat}%\nSMF: ${coll.smf}%\nदर: ₹${coll.rate}/लि.\n*एकूण रक्कम: ₹${coll.amount}*\n\nधन्यवाद! 🙏`;
      sendTelegramNotification(user.telegramChatId, receipt);
    }

    setNewCollection({ userId: "", session: "सकाळ", litres: "", fat: "", smf: "", rate: "" });
    showNotif("संकलन नोंदवून पावती पाठवली! ✅");
  };

  const handleAddUser = () => {
    if (!newUser.name || !newUser.mobile || !newUser.village) {
      showNotif("सर्व माहिती भरा", "error"); return;
    }
    if (editingUser) {
      setUsers(users.map(u => u.id === editingUser.id ? { ...u, ...newUser } : u));
      setEditingUser(null);
      showNotif("माहिती अद्ययावत केली ✅");
    } else {
      const user = {
        id: users.length + 1, ...newUser,
        joined: new Date().toISOString().split("T")[0],
      };
      setUsers([...users, user]);
      showNotif(`नवीन ${newUser.type} जोडला गेला ✅`);
    }
    setNewUser({ name: "", mobile: "", telegramChatId: "", village: "", type: "शेतकरी" });
  };

  const handleEditUser = (u) => {
    setEditingUser(u);
    setNewUser(u);
  };

  const getFarmer10DayRecords = (farmerId) => {
    if (!farmerId) return [];
    return collections
      .filter(c => c.userId === parseInt(farmerId))
      .slice(-10);
  };

  const downloadCSVReport = (farmerId) => {
    const records = getFarmer10DayRecords(farmerId);
    const farmer = users.find(u => u.id === parseInt(farmerId));
    if (records.length === 0) {
      alert("कोणताही डेटा उपलब्ध नाही.");
      return;
    }

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += `नाव: ${farmer?.name}, गाव/पत्ता: ${farmer?.village}, प्रकार: ${farmer?.type}\n`;
    csvContent += "तारीख,सत्र,दूध (लि.),फॅट (%),SMF (%),दर (रु),एकूण रक्कम (रु)\n";

    records.forEach(r => {
      csvContent += `${r.date},${r.session},${r.litres},${r.fat},${r.smf},${r.rate},${r.amount}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `१०_दिवसीय_रिपोर्ट_${farmer?.name}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const send10DayReportTelegram = (farmerId) => {
    const records = getFarmer10DayRecords(farmerId);
    const farmer = users.find(u => u.id === parseInt(farmerId));
    
    if (!farmer || !farmer.telegramChatId) {
      alert("टेलिग्राम चॅट आयडी उपलब्ध नाही.");
      return;
    }
    if (records.length === 0) {
      alert("पाठवण्यासाठी कोणताही डेटा नाही.");
      return;
    }

    let totalLitre = records.reduce((acc, item) => acc + item.litres, 0);
    let totalAmt = records.reduce((acc, item) => acc + item.amount, 0);

    let reportText = `📜 *१०-दिवसीय अहवाल - हिंदवी डेअरी* \n\n*नाव:* ${farmer.name}\n----------------------------\n`;
    records.forEach(r => {
      reportText += `📅 ${r.date} (${r.session})\n🥛 ${r.litres} लि. | F: ${r.fat} | S: ${r.smf} | ₹${r.rate} | *₹${r.amount}*\n\n`;
    });
    reportText += `----------------------------\n📊 *एकूण दूध:* ${totalLitre} लिटर\n💰 *एकूण पेमेंट:* ₹${totalAmt}\n\nधन्यवाद! 🙏`;

    sendTelegramNotification(farmer.telegramChatId, reportText);
    showNotif("१० दिवसांचा रिपोर्ट टेलिग्रामवर पाठवला! 📤");
  };

  const filteredUsers = users.filter(u => u.name.toLowerCase().includes(searchFarmer.toLowerCase()) || u.village.toLowerCase().includes(searchFarmer.toLowerCase()));

  // Style constants
  const S = {
    app: { minHeight: "100vh", background: "linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)", fontFamily: "'Noto Sans Devanagari', sans-serif", color: "#fff" },
    card: { background: "rgba(255,255,255,0.07)", backdropFilter: "blur(12px)", borderRadius: 16, padding: "20px", border: "1px solid rgba(255,255,255,0.12)", marginBottom: 16 },
    btn: (color = "#f7b731") => ({ background: color, color: color === "#f7b731" ? "#1a1a1a" : "#fff", border: "none", borderRadius: 10, padding: "10px 22px", fontFamily: "inherit", fontSize: 15, fontWeight: 700, cursor: "pointer" }),
    input: { background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 10, padding: "10px 14px", color: "#fff", width: "100%", boxSizing: "border-box" },
    label: { fontSize: 13, color: "#aad4f5", marginBottom: 4, display: "block" },
    tab: (active) => ({ padding: "10px 18px", borderRadius: 10, border: "none", background: active ? "#f7b731" : "rgba(255,255,255,0.08)", color: active ? "#1a1a1a" : "#ccc", cursor: "pointer", whiteSpace: "nowrap" }),
    header: { background: "rgba(0,0,0,0.35)", padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.1)" },
  };

  // ===== LOGIN SCREEN =====
  if (page === "login") return (
    <div style={{ ...S.app, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;600;700&display=swap" rel="stylesheet" />
      <div style={{ width: "100%", maxWidth: 420, textAlign: "center" }}>
        <div style={{ fontSize: 60, marginBottom: 10 }}>🐄</div>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: "#f7b731", margin: "0 0 4px" }}>हिंदवी दूध संकलन केंद्र</h1>
        <p style={{ color: "#aad4f5", fontSize: 14, marginBottom: 28 }}>चिंचोली</p>
        
        <div style={S.card}>
          <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
            <button onClick={() => setLoginRole("admin")} style={{ ...S.tab(loginRole === "admin"), flex: 1 }}>⚙️ व्यवस्थापक</button>
            <button onClick={() => setLoginRole("user")} style={{ ...S.tab(loginRole === "user"), flex: 1 }}>👨‍🌾 युझर पॅनेल</button>
          </div>

          <div style={{ marginBottom: 14, textAlign: "left" }}>
            <label style={S.label}>{loginRole === "admin" ? "Admin ID" : "📱 मोबाईल नंबर"}</label>
            <input style={S.input} value={loginId} onChange={e => setLoginId(e.target.value)} placeholder={loginRole === "admin" ? "admin" : "9876543210"} />
          </div>
          <div style={{ marginBottom: 20, textAlign: "left" }}>
            <label style={S.label}>🔒 पासवर्ड</label>
            <input type="password" style={S.input} value={loginPass} onChange={e => setLoginPass(e.target.value)} placeholder="••••••" />
          </div>
          {loginError && <div style={{ color: "#ff6b6b", marginBottom: 12 }}>{loginError}</div>}
          <button onClick={handleLogin} style={{ ...S.btn(), width: "100%", marginBottom: 10 }}>🚀 लॉग इन करा</button>
          
          {loginRole === "user" && <p style={{ fontSize: 12, color: "#aaa" }}>* युझरचा डीफॉल्ट पासवर्ड 1234 आहे.</p>}
        </div>
      </div>
    </div>
  );

  // ===== ADMIN PANEL =====
  if (page === "admin") {
    const tabs = [
      { key: "dashboard", label: "📊 डॅशबोर्ड" },
      { key: "collection", label: "🥛 दूध संकलन" },
      { key: "report10", label: "🧾 १०-दिवस रिपोर्ट" },
      { key: "users", label: "👥 शेतकरी/कंपनी" },
      { key: "admins", label: "⚙️ ॲडमीन व्यवस्थापन" }
    ];

    return (
      <div style={S.app}>
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;600;700&display=swap" rel="stylesheet" />
        {notification && (
          <div style={{ position: "fixed", top: 20, right: 20, background: "#27ae60", color: "#fff", padding: "12px 20px", borderRadius: 12, zIndex: 999 }}>
            {notification.msg}
          </div>
        )}
        <div style={S.header}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 16, color: "#f7b731" }}>🐄 हिंदवी दूध संकलन केंद्र</div>
            <div style={{ fontSize: 11, color: "#aaa" }}>व्यवस्थापक: {currentUser?.name}</div>
          </div>
          <button onClick={() => setPage("login")} style={S.btn("#e74c3c")}>🚪 बाहेर</button>
        </div>

        <div style={{ display: "flex", gap: 8, padding: "14px 16px", overflowX: "auto" }}>
          {tabs.map(t => <button key={t.key} onClick={() => setAdminTab(t.key)} style={S.tab(adminTab === t.key)}>{t.label}</button>)}
        </div>

        <div style={{ padding: "0 16px 80px" }}>
          {/* DASHBOARD */}
          {adminTab === "dashboard" && (
            <div style={S.card}>
              <h3>📊 आजची आकडेवारी</h3>
              <p>एकूण शेतकरी व कंपन्या संख्या: <b>{users.length}</b></p>
              <p>एकूण दूध संकलन नोंदी: <b>{collections.length}</b></p>
            </div>
          )}

          {/* MILK COLLECTION */}
          {adminTab === "collection" && (
            <div style={S.card}>
              <h3>🥛 नवीन दूध संकलन नोंदणी</h3>
              <div style={{ display: "grid", gap: 12 }}>
                <div>
                  <label style={S.label}>शेतकरी किंवा कंपनी निवडा</label>
                  <select style={S.input} value={newCollection.userId} onChange={e => setNewCollection({ ...newCollection, userId: e.target.value })}>
                    <option value="">-- निवडा --</option>
                    {users.map(u => <option key={u.id} value={u.id} style={{ color: '#000' }}>[{u.type}] {u.name} ({u.village})</option>)}
                  </select>
                </div>
                <div>
                  <label style={S.label}>सत्र (Session)</label>
                  <select style={S.input} value={newCollection.session} onChange={e => setNewCollection({ ...newCollection, session: e.target.value })}>
                    <option value="सकाळ">🌅 सकाळ</option>
                    <option value="संध्याकाळ">🌙 संध्याकाळ</option>
                  </select>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <label style={S.label}>दूध लिटर</label>
                    <input type="number" style={S.input} placeholder="0.0" value={newCollection.litres} onChange={e => setNewCollection({ ...newCollection, litres: e.target.value })} />
                  </div>
                  <div>
                    <label style={S.label}>दर (Rate प्रति लिटर)</label>
                    <input type="number" style={S.input} placeholder="₹ 0.0" value={newCollection.rate} onChange={e => setNewCollection({ ...newCollection, rate: e.target.value })} />
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <label style={S.label}>फॅट %</label>
                    <input type="number" style={S.input} placeholder="0.0" value={newCollection.fat} onChange={e => setNewCollection({ ...newCollection, fat: e.target.value })} />
                  </div>
                  <div>
                    <label style={S.label}>SMF %</label>
                    <input type="number" style={S.input} placeholder="0.0" value={newCollection.smf} onChange={e => setNewCollection({ ...newCollection, smf: e.target.value })} />
                  </div>
                </div>

                <div style={{ background: "rgba(46, 204, 113, 0.15)", padding: 12, borderRadius: 10, textAlign: "center", border: "1px dashed #2ecc71" }}>
                  <span style={{ fontSize: 16 }}>💰 एकूण रक्कम: <b>₹ {liveAmount}</b></span>
                </div>

                <button onClick={handleAddCollection} style={S.btn()}>✅ संकलन जतन करा</button>
              </div>
            </div>
          )}

          {/* 10-DAY REPORT */}
          {adminTab === "report10" && (
            <div style={S.card}>
              <h3>🧾 १०-दिवसीय रिपोर्ट (शेतकरी/कंपनी)</h3>
              <div style={{ marginBottom: 16 }}>
                <label style={S.label}>निवडा</label>
                <select style={S.input} value={selectedFarmerReport} onChange={e => setSelectedFarmerReport(e.target.value)}>
                  <option value="">-- निवडा --</option>
                  {users.map(u => <option key={u.id} value={u.id} style={{ color: '#000' }}>{u.name} ({u.type})</option>)}
                </select>
              </div>

              {selectedFarmerReport && (
                <div>
                  <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
                    <button onClick={() => downloadCSVReport(selectedFarmerReport)} style={S.btn("#3498db")}>📥 CSV डाउनलोड</button>
                    <button onClick={() => send10DayReportTelegram(selectedFarmerReport)} style={S.btn("#2ecc71")}>📤 टेलिग्रामवर पाठवा</button>
                  </div>

                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 14 }}>
                      <thead>
                        <tr style={{ borderBottom: "2px solid rgba(255,255,255,0.2)", color: "#aad4f5" }}>
                          <th style={{ padding: 8 }}>तारीख</th>
                          <th style={{ padding: 8 }}>सत्र</th>
                          <th style={{ padding: 8 }}>दूध (लि.)</th>
                          <th style={{ padding: 8 }}>फॅट</th>
                          <th style={{ padding: 8 }}>SMF</th>
                          <th style={{ padding: 8 }}>दर</th>
                          <th style={{ padding: 8 }}>रक्कम</th>
                        </tr>
                      </thead>
                      <tbody>
                        {getFarmer10DayRecords(selectedFarmerReport).map(r => (
                          <tr key={r.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                            <td style={{ padding: 8 }}>{r.date}</td>
                            <td style={{ padding: 8 }}>{r.session}</td>
                            <td style={{ padding: 8 }}>{r.litres}</td>
                            <td style={{ padding: 8 }}>{r.fat || "-"}</td>
                            <td style={{ padding: 8 }}>{r.smf || "-"}</td>
                            <td style={{ padding: 8 }}>₹{r.rate}</td>
                            <td style={{ padding: 8, color: "#2ecc71", fontWeight: "bold" }}>₹{r.amount}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* USERS MANAGEMENT */}
          {adminTab === "users" && (
            <div style={S.card}>
              <h3>👥 शेतकरी आणि कंपनी व्यवस्थापन</h3>
              
              <div style={{ display: "grid", gap: 12, marginBottom: 20, background: "rgba(255,255,255,0.03)", padding: 12, borderRadius: 10 }}>
                <div>
                  <label style={S.label}>प्रकार निवडा</label>
                  <select style={S.input} value={newUser.type} onChange={e => setNewUser({ ...newUser, type: e.target.value })}>
                    <option value="शेतकरी">शेतकरी (Farmer)</option>
                    <option value="कंपनी">कंपनी (Corporate/Bulk Company)</option>
                  </select>
                </div>
                <input style={S.input} placeholder="नाव (शेतकरी/कंपनीचे नाव)" value={newUser.name} onChange={e => setNewUser({ ...newUser, name: e.target.value })} />
                <input style={S.input} placeholder="मोबाईल नंबर" value={newUser.mobile} onChange={e => setNewUser({ ...newUser, mobile: e.target.value })} />
                <input style={S.input} placeholder="Telegram Chat ID (ऐच्छिक)" value={newUser.telegramChatId} onChange={e => setNewUser({ ...newUser, telegramChatId: e.target.value })} />
                <input style={S.input} placeholder="गाव / पत्ता" value={newUser.village} onChange={e => setNewUser({ ...newUser, village: e.target.value })} />
                <button onClick={handleAddUser} style={S.btn("#2ecc71")}>💾 माहिती जतन करा</button>
              </div>

              <div style={{ marginBottom: 12 }}>
                <input style={S.input} placeholder="🔍 नाव किंवा गावावरून शोधा..." value={searchFarmer} onChange={e => setSearchFarmer(e.target.value)} />
              </div>

              <div>
                {filteredUsers.map(u => (
                  <div key={u.id} style={{ background: "rgba(255,255,255,0.05)", padding: 12, borderRadius: 8, marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div><b>{u.name}</b> <span style={{ fontSize: 11, background: u.type === 'कंपनी' ? '#e67e22' : '#3498db', padding: '2px 6px', borderRadius: 4 }}>{u.type}</span></div>
                      <div style={{ fontSize: 12, color: "#aaa" }}>गाव: {u.village} | मोबाईल: {u.mobile}</div>
                    </div>
                    <button onClick={() => handleEditUser(u)} style={{ ...S.btn(), padding: "6px 12px", fontSize: 12 }}>✏️ दुरुस्त करा</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ADD NEW ADMIN PANEL */}
          {adminTab === "admins" && (
            <div style={S.card}>
              <h3>⚙️ नवीन व्यवस्थापक (Admin) जोडा</h3>
              <p style={{ fontSize: 13, color: '#aaa' }}>येथून जोडलेले नवीन ॲडमीन स्वतंत्रपणे त्यांच्या स्वतःच्या आयडीने लॉग इन करू शकतील.</p>
              
              <div style={{ display: "grid", gap: 12, marginTop: 15 }}>
                <div>
                  <label style={S.label}>ॲडमीनचे नाव</label>
                  <input style={S.input} placeholder="उदा. राहुल शिंदे" value={newAdminSetup.name} onChange={e => setNewAdminSetup({ ...newAdminSetup, name: e.target.value })} />
                </div>
                <div>
                  <label style={S.label}>नवीन Admin ID</label>
                  <input style={S.input} placeholder="उदा. admin2" value={newAdminSetup.id} onChange={e => setNewAdminSetup({ ...newAdminSetup, id: e.target.value })} />
                </div>
                <div>
                  <label style={S.label}>पासवर्ड</label>
                  <input type="password" style={S.input} placeholder="••••••" value={newAdminSetup.pass} onChange={e => setNewAdminSetup({ ...newAdminSetup, pass: e.target.value })} />
                </div>
                <button onClick={handleAddAdmin} style={S.btn("#2ecc71")}>➕ नवीन ॲडमीन सक्रिय करा</button>
              </div>

              <h4 style={{ marginTop: 25, color: '#aad4f5' }}>सध्याचे सक्रिय ॲडमीन:</h4>
              <ul>
                {adminsList.map((a, idx) => (
                  <li key={idx} style={{ marginBottom: 6 }}><b>{a.name}</b> (ID: <span style={{ color: '#f7b731' }}>{a.id}</span>)</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ===== USER / FARMER SCREEN =====
  if (page === "user" && currentUser) {
    const userRecords = getFarmer10DayRecords(currentUser.id);
    return (
      <div style={S.app}>
        <div style={S.header}>
          <div>
            <div style={{ fontWeight: 800 }}>👨‍🌾 {currentUser.name} ({currentUser.type})</div>
            <div style={{ fontSize: 11, color: "#ccc" }}>गाव/पत्ता: {currentUser.village}</div>
          </div>
          <button onClick={() => setPage("login")} style={S.btn("#e74c3c")}>🚪 बाहेर</button>
        </div>
        
        <div style={{ padding: 16 }}>
          {/* USER 10 DAY REPORT */}
          <div style={S.card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 15, flexWrap: "wrap", gap: 10 }}>
              <h3 style={{ color: '#f7b731', margin: 0 }}>📜 तुमचा १०-दिवसीय दूध अहवाल</h3>
              {userRecords.length > 0 && (
                <button onClick={() => downloadCSVReport(currentUser.id)} style={S.btn("#3498db")}>📥 रिपोर्ट डाउनलोड (CSV)</button>
              )}
            </div>

            {userRecords.length === 0 ? (
              <p style={{ color: '#aaa' }}>सध्या कोणतीही नोंद उपलब्ध नाही.</p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 14 }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid rgba(255,255,255,0.2)", color: "#aad4f5" }}>
                      <th style={{ padding: 8 }}>तारीख</th>
                      <th style={{ padding: 8 }}>सत्र</th>
                      <th style={{ padding: 8 }}>दूध (लि.)</th>
                      <th style={{ padding: 8 }}>फॅट</th>
                      <th style={{ padding: 8 }}>SMF</th>
                      <th style={{ padding: 8 }}>दर</th>
                      <th style={{ padding: 8 }}>रक्कम</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userRecords.map(r => (
                      <tr key={r.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                        <td style={{ padding: 8 }}>{r.date}</td>
                        <td style={{ padding: 8 }}>{r.session}</td>
                        <td style={{ padding: 8 }}>{r.litres} लि.</td>
                        <td style={{ padding: 8 }}>{r.fat}%</td>
                        <td style={{ padding: 8 }}>{r.smf}%</td>
                        <td style={{ padding: 8 }}>₹{r.rate}</td>
                        <td style={{ padding: 8, color: "#2ecc71", fontWeight: "bold" }}>₹{r.amount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ALL HISTORICAL RECORDS */}
          <div style={S.card}>
            <h3 style={{ color: '#aad4f5' }}>🥛 सर्व संकलन इतिहास</h3>
            {collections.filter(c => c.userId === currentUser.id).map(c => (
              <div key={c.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.1)", padding: "10px 0" }}>
                <div><b>दिनांक:</b> {c.date} ({c.session})</div>
                <div>दूध: {c.litres} लि. | फॅट: {c.fat}% | SMF: {c.smf}% | दर: ₹{c.rate}</div>
                <div style={{ color: "#2ecc71" }}><b>एकूण रक्कम: ₹{c.amount}</b></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }
}