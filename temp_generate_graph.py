import json
import os
import re

files_info = [
    ('проекты-6-этап-шаблон-паспорта-7lamp', 'Полный шаблон паспорта изделия 7Lamp', ['паспорт', 'тр_тс', 'шаблон', 'документация']),
    ('проекты-7-этап-post-mortem-анализ', 'Анализ проекта post-mortem', ['ретроспектива', 'улучшения', 'post_mortem']),
    ('проекты-7-этап-авторский-надзор', 'Авторский надзор', ['авторский_надзор', 'рекламации', 'кд']),
    ('проекты-7-этап-ведение-изменений-ecn', 'Ведение изменений (ECN/ECR)', ['ecn', 'ecr', 'ревизии']),
    ('проекты-7-этап-ведение-проекта-erp', 'Ведение проекта в WEEEK/ERP', ['weeek', 'erp', 'задачи']),
    ('проекты-7-этап-оперативка-с-подрядчиком', 'Оперативка с подрядчиком', ['подрядчики', 'оперативка', 'коммуникация']),
    ('проекты-7-этап-портфельное-управление', 'Портфельное управление проектами', ['портфель', 'загрузка', 'ресурсы']),
    ('проекты-7-этап-работа-с-браком-от-подрядчика', 'Работа с браком от подрядчика', ['брак', 'претензия', 'эскалация']),
    ('проекты-7-этап-расчёт-себестоимости', 'Расчёт себестоимости изделия', ['себестоимость', 'ценообразование']),
    ('проекты-7-этап-рекламации-и-гарантия', 'Работа с рекламациями и гарантийное обслуживание', ['рекламация', 'гарантия', 'дефект']),
    ('проекты-7-этап-серийное-производство', 'Управление серийным производством', ['серия', 'производство', 'партия']),
    ('проекты-7-этап-типовые-проекты-шаблоны', 'Типовые проекты как шаблоны', ['шаблоны', 'переиспользование']),
    ('проекты-7-этап-ценообразование-прайс', 'Ценообразование и формирование прайс-листа', ['прайс', 'маржа']),
    ('проекты-7-этап-чек-лист-приёмки-подрядчика', 'Приёмка работ подрядчика', ['приёмка', 'контроль_качества']),
    ('проекты-8-этап-гарантийное-обслуживание', 'Гарантийное обслуживание светильников', ['гарантийное_обслуживание', 'замена']),
    ('проекты-8-этап-замеры-освещённости', 'Замеры освещённости на объекте', ['замеры', 'люксметр', 'освещённость']),
    ('проекты-8-этап-инструкции-по-монтажу', 'Инструкции по монтажу для клиента', ['монтаж', 'инструкция', 'схемы']),
    ('проекты-8-этап-пусконаладка-систем-управления', 'Пусконаладка систем управления', ['пусконаладка', 'dali', 'сценарии']),
    ('проекты-8-этап-схема-монтажа-ikea-style', 'Схема монтажа IKEA-style', ['ikea_style', 'визуализация']),
    ('проекты-8-этап-типовые-проблемы-на-объекте', 'Типовые проблемы на объекте', ['проблемы_монтажа', 'объект']),
    ('проекты-8-этап-типовые-узлы-крепления', 'Типовые узлы крепления', ['крепление', 'подвес', 'накладной']),
    ('проекты-8-этап-упаковка-и-транспортировка', 'Упаковка и транспортировка', ['упаковка', 'транспортировка']),
    ('проекты-8-этап-фотофиксация-и-приёмка', 'Фотофиксация и приёмка', ['фотофиксация', 'акт_приёмки']),
    ('проекты-8-этап-шеф-монтаж', 'Шеф-монтаж', ['шеф_монтаж', 'площадка', 'инструктаж'])
]

def clean_id(s):
    return re.sub(r'[^a-z0-9_]', '_', s.lower())

nodes = []
edges = []
hyperedges = []

for stem, title, tags in files_info:
    file_path = f'lessons/{stem}.md'
    doc_id = f'{clean_id(stem)}_doc'
    
    nodes.append({
        'id': doc_id,
        'label': title,
        'file_type': 'document',
        'source_file': file_path,
        'source_location': None,
        'source_url': None,
        'captured_at': None,
        'author': None,
        'contributor': None
    })
    
    for tag in tags:
        concept_id = f'{clean_id(stem)}_{clean_id(tag)}'
        nodes.append({
            'id': concept_id,
            'label': tag.replace('_', ' ').title(),
            'file_type': 'rationale',
            'source_file': file_path,
            'source_location': None,
            'source_url': None,
            'captured_at': None,
            'author': None,
            'contributor': None
        })
        edges.append({
            'source': doc_id,
            'target': concept_id,
            'relation': 'conceptually_related_to',
            'confidence': 'EXTRACTED',
            'confidence_score': 1.0,
            'source_file': file_path,
            'source_location': None,
            'weight': 1.0
        })

edges.append({
    'source': f'{clean_id("проекты-7-этап-ведение-проекта-erp")}_{clean_id("weeek")}',
    'target': f'{clean_id("проекты-7-этап-ведение-проекта-erp")}_{clean_id("erp")}',
    'relation': 'semantically_similar_to',
    'confidence': 'INFERRED',
    'confidence_score': 0.85,
    'source_file': 'lessons/проекты-7-этап-ведение-проекта-erp.md',
    'source_location': None,
    'weight': 1.0
})

edges.append({
    'source': f'{clean_id("проекты-7-этап-ведение-изменений-ecn")}_{clean_id("ecn")}',
    'target': f'{clean_id("проекты-7-этап-ведение-изменений-ecn")}_{clean_id("ecr")}',
    'relation': 'conceptually_related_to',
    'confidence': 'INFERRED',
    'confidence_score': 0.95,
    'source_file': 'lessons/проекты-7-этап-ведение-изменений-ecn.md',
    'source_location': None,
    'weight': 1.0
})

hyperedges.append({
    'id': 'project_management_tools_hyper',
    'label': 'Project Management Tools',
    'nodes': [
        f'{clean_id("проекты-7-этап-ведение-проекта-erp")}_{clean_id("erp")}',
        f'{clean_id("проекты-7-этап-ведение-проекта-erp")}_{clean_id("weeek")}',
        f'{clean_id("проекты-7-этап-ведение-изменений-ecn")}_{clean_id("ecn")}',
        f'{clean_id("проекты-7-этап-ведение-изменений-ecn")}_{clean_id("ecr")}'
    ],
    'relation': 'participate_in',
    'confidence': 'INFERRED',
    'confidence_score': 0.75,
    'source_file': 'lessons/проекты-7-этап-ведение-проекта-erp.md'
})

hyperedges.append({
    'id': 'quality_control_hyper',
    'label': 'Quality Control Processes',
    'nodes': [
        f'{clean_id("проекты-7-этап-работа-с-браком-от-подрядчика")}_{clean_id("брак")}',
        f'{clean_id("проекты-7-этап-чек-лист-приёмки-подрядчика")}_{clean_id("приёмка")}',
        f'{clean_id("проекты-7-этап-рекламации-и-гарантия")}_{clean_id("рекламация")}',
        f'{clean_id("проекты-8-этап-гарантийное-обслуживание")}_{clean_id("гарантийное_обслуживание")}'
    ],
    'relation': 'participate_in',
    'confidence': 'INFERRED',
    'confidence_score': 0.85,
    'source_file': 'lessons/проекты-7-этап-работа-с-браком-от-подрядчика.md'
})

output = {
    'nodes': nodes,
    'edges': edges,
    'hyperedges': hyperedges,
    'input_tokens': 0,
    'output_tokens': 0
}

with open(r'graphify-out/.graphify_chunk_4.json', 'w', encoding='utf-8') as f:
    json.dump(output, f, ensure_ascii=False, indent=2)

print("JSON created successfully.")
