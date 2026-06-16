import type { InterventionKategori } from "@/types";

/**
 * Asuhan keperawatan catalog — predefined options for the nurse (Perawat)
 * consultation, mirroring the paper form's "Masalah keperawatan dan intervensi"
 * block. Free-text additions are allowed on top of these.
 */
export const NURSING_CATALOG: Record<InterventionKategori, ReadonlyArray<string>> = {
  masalah: [
    "Nyeri akut",
    "Hipertermi",
    "Nausea",
    "Resiko infeksi",
    "Resiko/Gg keseimbangan cairan",
    "Kerusakan integritas kulit",
    "Resiko/Aktual NKDK",
    "Resiko/Aktual jalan nafas tidak efektif",
    "Gangguan menelan",
    "Resiko ketidakstabilan gula darah",
    "Gg rasa nyaman",
    "Resiko/Gg perfusi jaringan",
    "Diare",
    "Defisit pengetahuan",
  ],
  etiologi: [
    "Agen cedera fisik/biologis",
    "Prosedur invasif",
    "Bronchospasme",
    "Asupan diet tidak adekuat",
    "Distensi abdomen",
    "Peningkatan suhu tubuh",
    "Absorpsi makanan dan minuman tidak adekuat",
    "Kerusakan membran mukosa/integumen/sub kutan",
    "Peningkatan vaskuler cerebral",
    "Perubahan frekuensi nafas",
  ],
  intervensi: [
    "Berikan informasi tentang masalah, penyebab, dan rencana antisipasi",
    "Lakukan perawatan luka",
    "Berikan minuman secukupnya",
    "Monitoring gejala infeksi",
    "Lakukan manajemen nyeri",
    "Kolaborasi pemberian obat analgetik/antipiretik/antibiotik",
    "Lakukan manajemen jalan nafas",
    "Lakukan monitoring vital sign",
    "Lakukan monitoring nutrisi",
    "Lakukan manajemen cairan",
    "Lakukan konseling",
    "Latih ROM aktif dan ROM pasif",
  ],
};

export const KATEGORI_LABEL: Record<InterventionKategori, string> = {
  masalah: "Masalah Keperawatan",
  etiologi: "Etiologi",
  intervensi: "Intervensi & Implementasi",
};

export const KATEGORI_ORDER: ReadonlyArray<InterventionKategori> = [
  "masalah",
  "etiologi",
  "intervensi",
];
