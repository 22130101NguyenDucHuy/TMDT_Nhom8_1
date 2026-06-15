// Auto-generated from academic-email-verifier package
// Known Vietnamese academic email domains (.edu.vn)
const academicDomains = {
  "bdu.edu.vn": "Binh Duong University",
  "ctu.edu.vn": "Can-Tho University",
  "dhxd.edu.vn": "Hanoi University of Civil Engineering",
  "dlu.edu.vn": "University of Da Lat",
  "fpt.edu.vn": "FPT University",
  "hau.edu.vn": "Hanoi University of Architecture",
  "hcmuaf.edu.vn": "Ho Chi Minh City University of Agriculture and Forestry",
  "hcmuarc.edu.vn": "Ho Chi Minh City University of Architecture",
  "hcmulaw.edu.vn": "Ho Chi Minh City University of Law",
  "hcmuns.edu.vn": "Ho Chi Minh City University of Natural Sciences",
  "hcmupeda.edu.vn": "Ho Chi Minh City University of Pedagogics",
  "hcmussh.edu.vn": "Ho Chi Minh City University of Social Sciences and Humanities",
  "hcmut.edu.vn": "Ho Chi Minh City University of Technology",
  "hcmute.edu.vn": "University of Technical Education Ho Chi Minh City",
  "hcmutrans.edu.vn": "Ho Chi Minh City University of Transport",
  "hmu.edu.vn": "Hanoi Medical University",
  "hou.edu.vn": "Hanoi Open University",
  "hua.edu.vn": "Hanoi University of Agriculture",
  "huaf.edu.vn": "Hue University of Agriculture and Forestry",
  "hueuni.edu.vn": "Hue University",
  "humg.edu.vn": "Hanoi University of Mining and Geology",
  "hus.edu.vn": "Hanoi University of Science",
  "hut.edu.vn": "Hanoi University of Technology",
  "hwru.edu.vn": "Water Resources University",
  "ktkt-haiduong.edu.vn": "Hai Duong University of  Economics and Technology",
  "neu.edu.vn": "Hanoi National Economics University",
  "ou.edu.vn": "Ho Chi Minh City Open University",
  "rmit.edu.vn": "RMIT International University Vietnam",
  "sgu.edu.vn": "Saigon University",
  "taynguyenuni.edu.vn": "Tay Nguyen University",
  "tuaf.edu.vn": "Thainguyen University of Agriculture and Forestry",
  "ud.edu.vn": "University of Da Nang",
  "ueh.edu.vn": "Ho Chi Minh City University of Economics",
  "vimaru.edu.vn": "Vietnam Maritime University",
  "vnu.edu.vn": "Vietnam National University Hanoi",
  "vnuhcm.edu.vn": "Vietnam National University Ho Chi Minh City",
  "yds.edu.vn": "Ho Chi Minh City University of Medicine and Pharmacy"
};

export default academicDomains;

export function getInstitutionName(email) {
  const domain = email.split('@').pop().toLowerCase();
  return academicDomains[domain] || "";
}

export function isAcademicEmail(email) {
  if (typeof email !== "string" || !email.includes("@")) return false;
  const domain = email.split('@').pop().toLowerCase();
  return !!academicDomains[domain];
}
