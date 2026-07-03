import json
import re
import os

files = [
    "ии_и_агенты-инструменты_ии-Designing delightful frontends with GPT-5.4.md",
    "ии_и_агенты-инструменты_ии-Генерация_изображения_в_нано_банано.md",
    "ии_и_агенты-инструменты_ии-Оpenclaw.md",
    "онбординг-внутренние_инструменты-Работа_с_7lamp_erp_v8.md",
    "онбординг-инструменты_ии-Hermes_Agent.md",
    "онбординг-инструменты_ии-llm-усиливает-инженера.md",
    "онбординг-инструменты_ии-генерация-тз-и-документации.md",
    "онбординг-инструменты_ии-поиск-компонентов-через-ии.md",
    "онбординг-инструменты_ии-промпты-для-инженерных-задач.md",
    "онбординг-планы_обучения-План_обучения_инженер_проектировщик.md",
    "продажи-передача-лида-от-хантера-фермеру.md",
    "продажи-план-обучения-коммерческого-отдела.md",
    "продажи-целевые-аудитории.md",
    "проекты-1-этап-mood-board-и-референсы.md",
    "проекты-1-этап-анализ-тз-от-заказчика.md",
    "проекты-1-этап-концепция-освещения.md",
    "проекты-1-этап-матрица-форма-технология.md",
    "проекты-1-этап-обследование-объекта.md",
    "проекты-1-этап-патентный-поиск.md",
    "проекты-1-этап-подготовка-коммерческого-предложения.md",
    "проекты-1-этап-предварительный-расчёт-бюджета.md",
    "проекты-1-этап-работа-с-архитектором.md",
    "проекты-1-этап-работа-с-дизайнером-интерьера.md",
    "проекты-1-этап-работа-с-чек-листами.md"
]

def normalize(name):
    mapping = {"а":"a", "б":"b", "в":"v", "г":"g", "д":"d", "е":"e", "ё":"e", "ж":"zh", "з":"z", "и":"i", "й":"i", "к":"k", "л":"l", "м":"m", "н":"n", "о":"o", "п":"p", "р":"r", "с":"s", "т":"t", "у":"u", "ф":"f", "х":"h", "ц":"ts", "ч":"ch", "ш":"sh", "щ":"shch", "ъ":"shch", "ы":"y", "ь":"", "э":"e", "ю":"yu", "я":"ya"}
    res = []
    for c in name.lower():
        if c in mapping:
            res.append(mapping[c])
        else:
            res.append(c)
    s = "".join(res)
    s = re.sub(r"[^a-z0-9_]", "_", s)
    s = re.sub(r"_+", "_", s).strip("_")
    return s

nodes = []
edges = []
hyperedges = []

def add_node(file, label, ftype="rationale", **kwargs):
    stem = normalize(file.replace(".md", ""))
    entity = normalize(label)
    nid = f"{stem}_{entity}"
    node = {
        "id": nid,
        "label": label,
        "file_type": ftype,
        "source_file": "lessons/" + file,
        "source_location": None,
        "source_url": None,
        "captured_at": None,
        "author": None,
        "contributor": None
    }
    node.update(kwargs)
    nodes.append(node)
    return nid

def add_edge(src, tgt, rel, conf_type, conf_score, file):
    edges.append({
        "source": src,
        "target": tgt,
        "relation": rel,
        "confidence": conf_type,
        "confidence_score": conf_score,
        "source_file": "lessons/" + file,
        "source_location": None,
        "weight": 1.0
    })

n_gpt = add_node(files[0], "GPT-5.4", "document", rationale="Model for generating polished frontends")
n_playwright = add_node(files[0], "Playwright")
n_react = add_node(files[0], "React")
add_edge(n_gpt, n_playwright, "conceptually_related_to", "INFERRED", 0.85, files[0])

n_nanobanana = add_node(files[1], "Nano Banana", "document", rationale="Gemini embedded capabilities for image generation")
n_synthid = add_node(files[1], "SynthID")
add_edge(n_nanobanana, n_synthid, "conceptually_related_to", "EXTRACTED", 1.0, files[1])

n_openclaw = add_node(files[2], "OpenClaw", "document", rationale="Platform for personal AI agents")
n_nodejs = add_node(files[2], "Node.js")
add_edge(n_openclaw, n_nodejs, "conceptually_related_to", "EXTRACTED", 1.0, files[2])

n_erp = add_node(files[3], "7LAMP ERP v8.0", "document", rationale="Enterprise management system")
n_sklad = add_node(files[3], "Склад")
n_spec = add_node(files[3], "Спецификации")
add_edge(n_erp, n_sklad, "conceptually_related_to", "EXTRACTED", 1.0, files[3])
add_edge(n_erp, n_spec, "conceptually_related_to", "EXTRACTED", 1.0, files[3])

n_hermes = add_node(files[4], "Hermes Agent", "document", rationale="Self-learning AI agent by Nous Research")
add_edge(n_hermes, n_openclaw, "semantically_similar_to", "INFERRED", 0.95, files[4])

n_llm = add_node(files[5], "LLM")
n_claude = add_node(files[5], "Claude")
add_edge(n_llm, n_claude, "conceptually_related_to", "EXTRACTED", 1.0, files[5])

n_tz = add_node(files[6], "Техническое задание (ТЗ)")
n_passport = add_node(files[6], "Паспорт изделия")
add_edge(n_llm, n_tz, "conceptually_related_to", "INFERRED", 0.85, files[6])

n_mcp = add_node(files[7], "MCP")
n_meanwell = add_node(files[7], "Mean Well")

n_prompt = add_node(files[8], "Промпт")
add_edge(n_llm, n_prompt, "conceptually_related_to", "EXTRACTED", 1.0, files[8])

n_weeeek = add_node(files[9], "WEEEK")
n_moi3d = add_node(files[9], "Moi3D")
n_dialux = add_node(files[9], "DIALux")
n_amocrm = add_node(files[9], "AmoCRM")

n_hunter = add_node(files[10], "Хантер", rationale="Sales role focused on lead qualification")
n_farmer = add_node(files[10], "Фермер", rationale="Sales role focused on closing deals")
add_edge(n_hunter, n_farmer, "shares_data_with", "INFERRED", 0.95, files[10])

n_architect = add_node(files[12], "Архитектор")
n_genpod = add_node(files[12], "Генподрядчик")

n_moodboard = add_node(files[13], "Mood-board", rationale="Collage for establishing visual style and tone")

n_ip_code = add_node(files[14], "IP-код")
n_kss = add_node(files[14], "КСС")
add_edge(n_tz, n_ip_code, "conceptually_related_to", "INFERRED", 0.85, files[14])

n_lighting_concept = add_node(files[15], "Концепция освещения", rationale="Describes the luminous environment principles")
n_cct = add_node(files[15], "CCT")
add_edge(n_lighting_concept, n_cct, "conceptually_related_to", "EXTRACTED", 1.0, files[15])
add_edge(n_lighting_concept, n_dialux, "conceptually_related_to", "INFERRED", 0.75, files[15])

n_extrusion = add_node(files[16], "Экструзия")
n_bending = add_node(files[16], "Гибка")

n_inspection = add_node(files[17], "Обследование объекта")
n_luxmeter = add_node(files[17], "Люксметр")
add_edge(n_inspection, n_luxmeter, "conceptually_related_to", "EXTRACTED", 1.0, files[17])

n_patent = add_node(files[18], "Патент")
n_fips = add_node(files[18], "ФИПС")
add_edge(n_patent, n_fips, "conceptually_related_to", "EXTRACTED", 1.0, files[18])

n_kp = add_node(files[19], "Коммерческое предложение (КП)")
add_edge(n_kp, n_dialux, "conceptually_related_to", "INFERRED", 0.75, files[19])

n_budget = add_node(files[20], "Бюджет")

add_edge(n_architect, n_lighting_concept, "conceptually_related_to", "INFERRED", 0.85, files[21])

n_designer = add_node(files[22], "Дизайнер интерьера")
add_edge(n_designer, n_lighting_concept, "conceptually_related_to", "INFERRED", 0.85, files[22])

n_checklist = add_node(files[23], "Чек-лист", rationale="Standardize procedures and eliminate omissions")

hyperedges.append({
    "id": "lighting_design_process",
    "label": "Lighting Design Process",
    "nodes": [n_tz, n_lighting_concept, n_kp, n_budget],
    "relation": "participate_in",
    "confidence": "INFERRED",
    "confidence_score": 0.85,
    "source_file": "lessons/" + files[15]
})

hyperedges.append({
    "id": "sales_roles_interaction",
    "label": "Sales Roles Interaction",
    "nodes": [n_hunter, n_farmer, n_erp, n_amocrm],
    "relation": "participate_in",
    "confidence": "INFERRED",
    "confidence_score": 0.85,
    "source_file": "lessons/" + files[10]
})

out = {
    "nodes": nodes,
    "edges": edges,
    "hyperedges": hyperedges,
    "input_tokens": 0,
    "output_tokens": 0
}

import os
os.makedirs("graphify-out", exist_ok=True)
with open("graphify-out/.graphify_chunk_0.json", "w", encoding="utf-8") as f:
    json.dump(out, f, ensure_ascii=False, indent=2)

print("done")
