from __future__ import annotations

import json
import os
import sys
import shutil
from datetime import datetime
from pathlib import Path

from PySide6.QtCore import QObject, Qt, QTimer, QUrl, Signal, Slot
from PySide6.QtGui import QAction
from PySide6.QtWebChannel import QWebChannel
from PySide6.QtWebEngineWidgets import QWebEngineView
from PySide6.QtWidgets import (
    QAbstractItemView,
    QApplication,
    QCheckBox,
    QComboBox,
    QDialog,
    QDialogButtonBox,
    QFormLayout,
    QGridLayout,
    QGroupBox,
    QHBoxLayout,
    QLabel,
    QLineEdit,
    QListWidget,
    QListWidgetItem,
    QMainWindow,
    QMenu,
    QMessageBox,
    QPushButton,
    QPlainTextEdit,
    QSplitter,
    QTableWidget,
    QTableWidgetItem,
    QTextEdit,
    QVBoxLayout,
    QWidget,
)

from exercise_audit_backend import (
    AI_SUGGEST_FIELDS,
    FIELD_LABELS,
    AppConfig,
    ConfigStore,
    WorkbookAuditStore,
    ai_bulk_suggestions,
    ai_name_suggestion,
    local_name_suggestion,
    local_full_suggestion,
    normalize_name_key,
    toggle_list_value,
)


HTML_TEMPLATE = r"""<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Exercise Audit Preview</title>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/bodymovin/5.12.2/lottie.min.js"></script>
  <script src="qrc:///qtwebchannel/qwebchannel.js"></script>
  <style>
    :root {
      --bg: #0f1115;
      --panel: #171a21;
      --text: #e8ecf1;
      --muted: #9aa6b2;
      --border: #2a3140;
      --stage-bg:
        linear-gradient(45deg, rgba(255,255,255,0.04) 25%, transparent 25%),
        linear-gradient(-45deg, rgba(255,255,255,0.04) 25%, transparent 25%),
        linear-gradient(45deg, transparent 75%, rgba(255,255,255,0.04) 75%),
        linear-gradient(-45deg, transparent 75%, rgba(255,255,255,0.04) 75%);
      --stage-wrap-bg: radial-gradient(circle at top, #18202d 0%, #0b0d12 70%);
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: var(--bg);
      height: 100vh;
      overflow: hidden;
    }
    .stage-wrap {
      height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 8px;
      background: var(--stage-wrap-bg);
    }
    .stage {
      width: min(calc(100vh - 16px), calc(100vw - 16px));
      height: min(calc(100vh - 16px), calc(100vw - 16px));
      min-width: 0;
      min-height: 0;
      border: 1px dashed var(--border);
      border-radius: 18px;
      background: var(--stage-bg);
      background-size: 24px 24px;
      background-position: 0 0, 0 12px, 12px -12px, -12px 0px;
    }
  </style>
</head>
<body>
  <div class="stage-wrap">
    <div id="stage" class="stage"></div>
  </div>
  <script>
    let bridge = null;
    let anim = null;
    function destroyAnim() {
      if (anim) { anim.destroy(); anim = null; }
      document.getElementById('stage').innerHTML = '';
    }
    async function openIndex(indexValue) {
      destroyAnim();
      const payload = JSON.parse(await bridge.getAnimationPayload(String(indexValue)));
      if (!payload.ok) {
        return;
      }
      anim = lottie.loadAnimation({
        container: document.getElementById('stage'),
        renderer: 'svg',
        loop: true,
        autoplay: true,
        animationData: payload.data
      });
    }
    function resetPreview() {
      destroyAnim();
    }
    function setAuditBackground(mode) {
      const wrap = document.querySelector('.stage-wrap');
      const stage = document.getElementById('stage');
      if (mode === 'light') {
        wrap.style.background = '#ffffff';
        stage.style.background = '#ffffff';
      } else if (mode === 'transparent') {
        wrap.style.background = 'transparent';
        stage.style.background = 'transparent';
      } else {
        wrap.style.background = 'radial-gradient(circle at top, #18202d 0%, #0b0d12 70%)';
        stage.style.background =
          'linear-gradient(45deg, rgba(255,255,255,0.04) 25%, transparent 25%),' +
          'linear-gradient(-45deg, rgba(255,255,255,0.04) 25%, transparent 25%),' +
          'linear-gradient(45deg, transparent 75%, rgba(255,255,255,0.04) 75%),' +
          'linear-gradient(-45deg, transparent 75%, rgba(255,255,255,0.04) 75%)';
        stage.style.backgroundSize = '24px 24px';
        stage.style.backgroundPosition = '0 0, 0 12px, 12px -12px, -12px 0px';
      }
    }
    new QWebChannel(qt.webChannelTransport, function(channel) {
      bridge = channel.objects.bridge;
      bridge.getInitialPayload().then(() => {});
    });
    window.openAnimationIndex = openIndex;
    window.resetAuditPreview = resetPreview;
    window.setAuditBackground = setAuditBackground;
  </script>
</body>
</html>
"""


class LottieBridge(QObject):
    def __init__(self, app_window: "AuditWindow"):
        super().__init__()
        self.app_window = app_window

    @Slot(result=str)
    def getInitialPayload(self) -> str:
        return json.dumps({"status": "Bereit."}, ensure_ascii=False)

    @Slot(str, result=str)
    def getAnimationPayload(self, index_value: str) -> str:
        title = f"Index {index_value}"
        try:
            index_number = int(index_value)
        except ValueError:
            return json.dumps({"ok": False, "title": title, "error": "Ungültiger Index."}, ensure_ascii=False)
        if self.app_window.store is None:
            return json.dumps({"ok": False, "title": title, "error": "Keine Daten geladen."}, ensure_ascii=False)
        path = self.app_window.store.animation_path_for(index_number)
        if not path.exists():
            return json.dumps({"ok": False, "title": title, "path": str(path), "error": "Animation nicht gefunden."}, ensure_ascii=False)
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
            return json.dumps({"ok": True, "title": title, "path": str(path), "data": data}, ensure_ascii=False)
        except Exception as exc:
            return json.dumps({"ok": False, "title": title, "path": str(path), "error": str(exc)}, ensure_ascii=False)


class AuditPreviewWebView(QWebEngineView):
    leftClicked = Signal()

    def mousePressEvent(self, event):
        if event.button() == Qt.LeftButton:
            self.leftClicked.emit()
        super().mousePressEvent(event)


class SuggestionReviewDialog(QDialog):
    def __init__(self, parent: QWidget, rows: list[dict[str, object]]):
        super().__init__(parent)
        self.setWindowTitle("KI-Vorschläge prüfen")
        self.resize(1480, 820)
        self.rows = rows
        self.table = QTableWidget(len(rows), 2 + len(AI_SUGGEST_FIELDS) + 1)

        layout = QVBoxLayout(self)
        intro = QLabel(
            "Die KI-Vorschläge werden hier nur angezeigt. "
            "Du kannst sie vor dem Übernehmen ändern, einzelne Vorschläge abwählen oder abbrechen."
        )
        intro.setWordWrap(True)
        layout.addWidget(intro)

        toggle_row = QHBoxLayout()
        select_all = QPushButton("Alle markieren")
        select_all.clicked.connect(lambda: self._set_all_checked(True))
        select_none = QPushButton("Keine markieren")
        select_none.clicked.connect(lambda: self._set_all_checked(False))
        toggle_row.addWidget(select_all)
        toggle_row.addWidget(select_none)
        toggle_row.addStretch(1)
        layout.addLayout(toggle_row)

        headers = ["Übern.", "Index", *[FIELD_LABELS[field] for field in AI_SUGGEST_FIELDS], "Begründung"]
        self.table.setHorizontalHeaderLabels(headers)
        self.table.setSelectionBehavior(QAbstractItemView.SelectRows)
        self.table.setEditTriggers(QAbstractItemView.AllEditTriggers)
        self.table.verticalHeader().setVisible(False)
        self.table.setWordWrap(False)
        self.table.setAlternatingRowColors(True)
        self.table.setSortingEnabled(False)

        for row_index, row in enumerate(rows):
            entry = row["entry"]
            suggestion = row["suggestion"]
            enabled_item = QTableWidgetItem()
            enabled_item.setCheckState(Qt.Checked)
            self.table.setItem(row_index, 0, enabled_item)
            index_item = QTableWidgetItem(str(entry.index))
            index_item.setFlags(index_item.flags() & ~Qt.ItemIsEditable)
            self.table.setItem(row_index, 1, index_item)
            for col_offset, field_name in enumerate(AI_SUGGEST_FIELDS, start=2):
                self.table.setItem(row_index, col_offset, QTableWidgetItem(str(suggestion.get(field_name, ""))))
            reason_item = QTableWidgetItem(str(suggestion.get("reason", "")))
            self.table.setItem(row_index, len(headers) - 1, reason_item)

        self.table.resizeColumnsToContents()
        layout.addWidget(self.table, 1)

        buttons = QDialogButtonBox(QDialogButtonBox.Ok | QDialogButtonBox.Cancel)
        buttons.button(QDialogButtonBox.Ok).setText("Ausgewählte Vorschläge übernehmen")
        buttons.button(QDialogButtonBox.Cancel).setText("Abbrechen")
        buttons.accepted.connect(self.accept)
        buttons.rejected.connect(self.reject)
        layout.addWidget(buttons)

    def _set_all_checked(self, checked: bool) -> None:
        for row in range(self.table.rowCount()):
            item = self.table.item(row, 0)
            if item:
                item.setCheckState(Qt.Checked if checked else Qt.Unchecked)

    def selected_payload(self) -> dict[int, dict[str, str]]:
        payload: dict[int, dict[str, str]] = {}
        for row in range(self.table.rowCount()):
            enabled_item = self.table.item(row, 0)
            index_item = self.table.item(row, 1)
            if not enabled_item or enabled_item.checkState() != Qt.Checked or not index_item:
                continue
            payload[int(index_item.text())] = {
                field_name: (self.table.item(row, col_index) or QTableWidgetItem("")).text().strip()
                for col_index, field_name in enumerate(AI_SUGGEST_FIELDS, start=2)
            }
        return payload

    def reason_for(self, index_value: int) -> str:
        for row in range(self.table.rowCount()):
            index_item = self.table.item(row, 1)
            reason_item = self.table.item(row, 2 + len(AI_SUGGEST_FIELDS))
            if index_item and reason_item and index_item.text().strip() == str(index_value):
                return reason_item.text().strip()
        return ""


class AuditWindow(QMainWindow):
    def __init__(self, base_dir: Path):
        super().__init__()
        self.base_dir = base_dir
        self.config_store = ConfigStore(base_dir)
        self.config = self.config_store.load()
        self.store: WorkbookAuditStore | None = None
        self.current_index: int | None = None
        self.field_inputs: dict[str, QWidget] = {}
        self.preview_views: list[QWebEngineView] = []
        self.compare_preview_views: list[QWebEngineView] = []
        self.category_map: dict[str, str] = {}
        self.muscle_map: dict[str, str] = {}
        self.category_en_values: list[str] = []
        self.muscle_en_values: list[str] = []
        self.muscle_latin_values: list[str] = []
        self._updating_selectors = False
        self.current_selection_indices: list[int] = []
        self.pending_multi_assignments: dict[tuple[str, str, str], bool] = {}
        self.undo_stack: list[dict[str, object]] = []
        self.created_backup_targets: set[Path] = set()
        self.current_preview_indices: list[int] = []
        self.explicit_edit_index: int | None = None

        self.setWindowTitle("Exercise Audit Tool")
        self.resize(1800, 1040)
        self._build_ui()
        self._load_config_into_inputs()
        self.load_data()

    def _build_ui(self) -> None:
        central = QWidget()
        self.setCentralWidget(central)
        layout = QVBoxLayout(central)
        layout.setContentsMargins(10, 10, 10, 10)
        layout.setSpacing(8)

        self.preview_background_mode = QComboBox()
        self.preview_background_mode.addItem("Dunkel", "dark")
        self.preview_background_mode.addItem("Weiß", "light")
        self.preview_background_mode.addItem("Transparent", "transparent")
        self.preview_background_mode.setCurrentIndex(self.preview_background_mode.findData("light"))
        self.preview_background_mode.currentIndexChanged.connect(self.apply_preview_background)

        main_splitter = QSplitter(Qt.Horizontal)
        layout.addWidget(main_splitter, 1)

        self.excel_input = QLineEdit()
        self.json_input = QLineEdit()
        self.animations_input = QLineEdit()
        self.report_input = QLineEdit()
        for line_edit in [self.excel_input, self.json_input, self.animations_input, self.report_input]:
            line_edit.setMinimumWidth(240)

        left_panel = QWidget()
        left_layout = QVBoxLayout(left_panel)
        left_layout.setContentsMargins(0, 0, 0, 0)
        left_layout.setSpacing(6)
        main_splitter.addWidget(left_panel)

        left_splitter = QSplitter(Qt.Vertical)
        left_layout.addWidget(left_splitter, 1)

        top_left_widget = QWidget()
        top_left_layout = QVBoxLayout(top_left_widget)
        top_left_layout.setContentsMargins(0, 0, 0, 0)
        top_left_layout.setSpacing(6)

        self.top_left_splitter = QSplitter(Qt.Horizontal)
        preview_box = QGroupBox("Animation")
        preview_layout = QVBoxLayout(preview_box)
        self.preview_splitter = QSplitter(Qt.Vertical)

        top_preview_widget = QWidget()
        self.top_preview_widget = top_preview_widget
        top_preview_layout = QHBoxLayout(top_preview_widget)
        top_preview_layout.setContentsMargins(0, 0, 0, 0)
        top_preview_layout.setSpacing(8)
        self.quick_preview_index_label = QLabel("—")
        self.quick_preview_index_label.setMinimumWidth(54)
        self.quick_preview_index_label.setAlignment(Qt.AlignLeft | Qt.AlignVCenter)
        top_preview_layout.addWidget(self.quick_preview_index_label, 0, Qt.AlignTop)
        self.quick_preview = self._create_preview_webview("main")
        self.quick_preview.setMinimumHeight(0)
        top_preview_layout.addWidget(self.quick_preview, 1)
        self.preview_splitter.addWidget(top_preview_widget)

        bottom_preview_widget = QWidget()
        self.bottom_preview_widget = bottom_preview_widget
        bottom_preview_layout = QVBoxLayout(bottom_preview_widget)
        bottom_preview_layout.setContentsMargins(0, 0, 0, 0)
        bottom_preview_layout.setSpacing(0)
        self.compare_info_label = QLabel("")
        self.compare_info_label.hide()
        self.compare_preview_row = QHBoxLayout()
        self.compare_preview_containers = []
        self.compare_preview_index_labels = []
        for _ in range(6):
            compare_container = QWidget()
            compare_container_layout = QHBoxLayout(compare_container)
            compare_container_layout.setContentsMargins(0, 0, 0, 0)
            compare_container_layout.setSpacing(6)
            compare_index_label = QLabel("—")
            compare_index_label.setMinimumWidth(54)
            compare_index_label.setAlignment(Qt.AlignLeft | Qt.AlignVCenter)
            compare_container_layout.addWidget(compare_index_label, 0, Qt.AlignTop)
            compare_view = self._create_preview_webview(f"compare_{len(self.compare_preview_views)}", register_main=False)
            compare_view.setMinimumHeight(0)
            compare_container_layout.addWidget(compare_view, 1)
            compare_container.hide()
            self.compare_preview_containers.append(compare_container)
            self.compare_preview_index_labels.append(compare_index_label)
            self.compare_preview_views.append(compare_view)
            self.compare_preview_row.addWidget(compare_container, 1)
        bottom_preview_layout.addLayout(self.compare_preview_row)
        self.preview_splitter.addWidget(bottom_preview_widget)
        self.preview_splitter.setChildrenCollapsible(False)
        self.preview_splitter.setStretchFactor(0, 1)
        self.preview_splitter.setStretchFactor(1, 1)
        self.preview_splitter.setSizes([170, 170])
        preview_layout.addWidget(self.preview_splitter)
        self.top_left_splitter.addWidget(preview_box)

        self.meta_index = QLabel("—")
        self.meta_author = QLabel("—")
        self.meta_pack = QLabel("—")
        self.meta_original = QLabel("—")
        self.meta_animation = QLabel("—")
        self.meta_animation_group = QLabel("—")

        bottom_left_widget = QWidget()
        bottom_left_layout = QVBoxLayout(bottom_left_widget)
        bottom_left_layout.setContentsMargins(0, 0, 0, 0)
        bottom_left_layout.setSpacing(6)

        filter_row = QHBoxLayout()
        self.view_mode = QComboBox()
        self.view_mode.addItem("Einzelliste", "entries")
        self.view_mode.addItem("Dubletten-Gruppen", "duplicate_groups")
        self.view_mode.addItem("Gender-Varianten Paare", "gender_variant_pairs")
        self.view_mode.addItem("Gender-Varianten Kandidaten", "gender_variant_candidates")
        self.view_mode.addItem("Kategorie-Konflikt-Gruppen", "equipment_groups")
        self.view_mode.currentIndexChanged.connect(self.refresh_table)
        self.filter_mode = QComboBox()
        self.filter_mode.addItem("Alle Übungen", "all")
        self.filter_mode.addItem("Nur Dubletten", "duplicates")
        self.filter_mode.addItem("Nur verdächtige Namen", "suspicious")
        self.filter_mode.addItem("Nur JSON-Abweichungen", "json_mismatch")
        self.filter_mode.addItem("Nur Gender-Paare", "gender_variant_pairs")
        self.filter_mode.addItem("Nur Gender-Kandidaten", "gender_variant_candidates")
        self.filter_mode.addItem("Nur Kategorie prüfen", "equipment_conflict")
        self.filter_mode.currentIndexChanged.connect(self.refresh_table)
        self.search_input = QLineEdit()
        self.search_input.setPlaceholderText("Suche nach Index, Name, Originalname, Pack ...")
        self.search_input.textChanged.connect(self.refresh_table)
        filter_row.addWidget(self.view_mode)
        filter_row.addWidget(self.filter_mode)
        filter_row.addWidget(self.search_input, 1)
        bottom_left_layout.addLayout(filter_row)

        self.status_legend_text = (
            "Status: OK = Excel und App-JSON stimmen überein. "
            "Duplikatname = derselbe DE-Name kommt mehrfach vor. "
            "Verdächtiger Name = Name wirkt automatisch erzeugt oder sprachlich schief. "
            "JSON abweichend = Excel und App-JSON unterscheiden sich. "
            "Kategorie prüfen = 'ohne Gerät' passt vermutlich nicht. "
            "Animation fehlt = keine Lottie-Datei zum Index."
        )

        self.table = QTableWidget(0, 8)
        self.table.setHorizontalHeaderLabels(["Index", "Name", "Name EN", "Dubletten", "Status", "Pack", "Autor", "Original"])
        self.table.horizontalHeaderItem(4).setToolTip(
            "Status\n\n"
            "OK\nExcel und App-JSON stimmen überein.\n\n"
            "Duplikatname\nDerselbe deutsche Name kommt mehrfach vor.\n\n"
            "Verdächtiger Name\nName wirkt automatisch erzeugt oder sprachlich schief.\n\n"
            "JSON abweichend\nExcel-Master und App-JSON unterscheiden sich in mindestens einem Feld.\n\n"
            "Kategorie prüfen\n'ohne Gerät' passt vermutlich nicht zur Übung.\n\n"
            "Animation fehlt\nFür den Index wurde keine Lottie-Datei gefunden."
        )
        self.table.setSelectionBehavior(QAbstractItemView.SelectRows)
        self.table.setSelectionMode(QAbstractItemView.ExtendedSelection)
        self.table.setEditTriggers(QAbstractItemView.NoEditTriggers)
        self.table.verticalHeader().setVisible(False)
        self.table.horizontalHeader().setStretchLastSection(True)
        self.table.setSortingEnabled(True)
        self.table.itemSelectionChanged.connect(self.on_table_selection_changed)
        self.table.setMouseTracking(True)
        self.table.setContextMenuPolicy(Qt.CustomContextMenu)
        self.table.customContextMenuRequested.connect(self.show_table_context_menu)

        bottom_left_layout.addWidget(self.table, 1)

        self.fields_box = QGroupBox("Bearbeiten")
        fields_layout = QGridLayout(self.fields_box)
        self.field_inputs["name"] = QLineEdit()
        self.field_inputs["nameEn"] = QLineEdit()
        self.field_inputs["gender"] = QComboBox()
        self.field_inputs["gender"].addItem("—", "")
        self.field_inputs["gender"].addItem("m", "m")
        self.field_inputs["gender"].addItem("w", "w")
        self.field_inputs["genderVariantGroup"] = QLineEdit()
        self.field_inputs["categories"] = QLineEdit()
        self.field_inputs["categoriesEn"] = QLineEdit()
        self.field_inputs["muscles"] = QLineEdit()
        self.field_inputs["musclesEn"] = QLineEdit()
        self.field_inputs["musclesLatin"] = QLineEdit()
        self.field_inputs["shortDescription"] = QPlainTextEdit()
        self.field_inputs["shortDescriptionEn"] = QPlainTextEdit()
        self.field_inputs["notes"] = QPlainTextEdit()
        self.field_inputs["notesEn"] = QPlainTextEdit()

        row = 0
        for field_name in ["name", "nameEn", "gender", "genderVariantGroup"]:
            fields_layout.addWidget(QLabel(FIELD_LABELS[field_name]), row, 0)
            fields_layout.addWidget(self.field_inputs[field_name], row, 1)
            row += 1

        for field_name in ["shortDescription", "shortDescriptionEn", "notes", "notesEn"]:
            widget = self.field_inputs[field_name]
            widget.setMaximumHeight(96)
            widget.setStyleSheet("font-size: 11px;")
            fields_layout.addWidget(QLabel(FIELD_LABELS[field_name]), row, 0)
            fields_layout.addWidget(widget, row, 1)
            row += 1
        self.fields_box.setStyleSheet("QGroupBox{font-size:11px;font-weight:600;} QLabel{font-size:10px;} QLineEdit,QComboBox,QPlainTextEdit{font-size:10px;padding:1px 2px;}")
        right_panel = QWidget()
        right_layout = QVBoxLayout(right_panel)
        right_layout.setContentsMargins(0, 0, 0, 0)
        right_layout.setSpacing(8)
        main_splitter.addWidget(right_panel)

        self.edit_scope_label = QLabel("")
        self.edit_scope_label.setWordWrap(True)
        self.edit_scope_label.setStyleSheet("padding: 6px 8px; border: 1px solid #caa63a; border-radius: 6px; background: #fff7d6; color: #6b5300; font-weight: 600;")
        self.edit_scope_label.hide()
        edit_wrapper = QWidget()
        edit_wrapper_layout = QVBoxLayout(edit_wrapper)
        edit_wrapper_layout.setContentsMargins(0, 0, 0, 0)
        edit_wrapper_layout.setSpacing(6)
        edit_wrapper_layout.addWidget(self.edit_scope_label)
        edit_wrapper_layout.addWidget(self.fields_box, 1)
        self.top_left_splitter.addWidget(edit_wrapper)
        self.top_left_splitter.setStretchFactor(0, 3)
        self.top_left_splitter.setStretchFactor(1, 2)
        self.top_left_splitter.setSizes([980, 420])
        top_left_layout.addWidget(self.top_left_splitter)
        left_splitter.addWidget(top_left_widget)

        self.selector_box = QGroupBox("Schnellzuweisung")
        self.selector_box.setStyleSheet("QGroupBox{font-size:11px;font-weight:600;} QLabel{font-size:9px;} QListWidget{font-size:9px;} QLineEdit,QPushButton{font-size:9px;padding:1px 2px;}")
        selector_layout = QGridLayout(self.selector_box)
        selector_layout.setContentsMargins(6, 6, 6, 6)
        selector_layout.setSpacing(6)
        category_column = QVBoxLayout()
        category_label = QLabel("Kategorien (DE)")
        category_label.setAlignment(Qt.AlignLeft | Qt.AlignTop)
        category_column.addWidget(category_label)
        self.category_list = QListWidget()
        self.category_list.itemChanged.connect(self.on_category_item_changed)
        self.category_list.setVerticalScrollMode(QListWidget.ScrollPerPixel)
        self.category_list.setMinimumHeight(120)
        self.category_list.setSizeAdjustPolicy(QListWidget.AdjustToContents)
        category_column.addWidget(self.category_list, 1)
        category_add_row = QHBoxLayout()
        self.category_add_input = QLineEdit()
        self.category_add_input.setPlaceholderText("Neue Kategorie")
        self.category_add_button = QPushButton("Hinzufügen")
        self.category_add_button.clicked.connect(self.add_manual_category)
        category_add_row.addWidget(self.category_add_input)
        category_add_row.addWidget(self.category_add_button)
        category_column.addLayout(category_add_row)

        category_en_column = QVBoxLayout()
        category_en_label = QLabel("Kategorien (EN)")
        category_en_label.setAlignment(Qt.AlignLeft | Qt.AlignTop)
        category_en_column.addWidget(category_en_label)
        self.category_en_list = QListWidget()
        self.category_en_list.itemChanged.connect(self.on_category_en_item_changed)
        self.category_en_list.setVerticalScrollMode(QListWidget.ScrollPerPixel)
        self.category_en_list.setMinimumHeight(120)
        category_en_column.addWidget(self.category_en_list, 1)
        category_en_add_row = QHBoxLayout()
        self.category_en_add_input = QLineEdit()
        self.category_en_add_input.setPlaceholderText("Neue Kategorie EN")
        self.category_en_add_button = QPushButton("Hinzufügen")
        self.category_en_add_button.clicked.connect(self.add_manual_category_en)
        category_en_add_row.addWidget(self.category_en_add_input)
        category_en_add_row.addWidget(self.category_en_add_button)
        category_en_column.addLayout(category_en_add_row)

        muscle_column = QVBoxLayout()
        muscle_label = QLabel("Muskeln (DE)")
        muscle_label.setAlignment(Qt.AlignLeft | Qt.AlignTop)
        muscle_column.addWidget(muscle_label)
        self.muscle_list = QListWidget()
        self.muscle_list.itemChanged.connect(self.on_muscle_item_changed)
        self.muscle_list.setVerticalScrollMode(QListWidget.ScrollPerPixel)
        self.muscle_list.setMinimumHeight(120)
        self.muscle_list.setSizeAdjustPolicy(QListWidget.AdjustToContents)
        muscle_column.addWidget(self.muscle_list, 1)
        muscle_add_row = QHBoxLayout()
        self.muscle_add_input = QLineEdit()
        self.muscle_add_input.setPlaceholderText("Neuer Muskel")
        self.muscle_add_button = QPushButton("Hinzufügen")
        self.muscle_add_button.clicked.connect(self.add_manual_muscle)
        muscle_add_row.addWidget(self.muscle_add_input)
        muscle_add_row.addWidget(self.muscle_add_button)
        muscle_column.addLayout(muscle_add_row)
        muscle_en_column = QVBoxLayout()
        muscle_en_label = QLabel("Muskeln (EN)")
        muscle_en_label.setAlignment(Qt.AlignLeft | Qt.AlignTop)
        muscle_en_column.addWidget(muscle_en_label)
        self.muscle_en_list = QListWidget()
        self.muscle_en_list.itemChanged.connect(self.on_muscle_en_item_changed)
        self.muscle_en_list.setVerticalScrollMode(QListWidget.ScrollPerPixel)
        self.muscle_en_list.setMinimumHeight(120)
        muscle_en_column.addWidget(self.muscle_en_list, 1)
        muscle_en_add_row = QHBoxLayout()
        self.muscle_en_add_input = QLineEdit()
        self.muscle_en_add_input.setPlaceholderText("Neuer Muskel EN")
        self.muscle_en_add_button = QPushButton("Hinzufügen")
        self.muscle_en_add_button.clicked.connect(self.add_manual_muscle_en)
        muscle_en_add_row.addWidget(self.muscle_en_add_input)
        muscle_en_add_row.addWidget(self.muscle_en_add_button)
        muscle_en_column.addLayout(muscle_en_add_row)

        muscle_latin_column = QVBoxLayout()
        muscle_latin_label = QLabel("Muskeln (lat.)")
        muscle_latin_label.setAlignment(Qt.AlignLeft | Qt.AlignTop)
        muscle_latin_column.addWidget(muscle_latin_label)
        self.muscle_latin_list = QListWidget()
        self.muscle_latin_list.itemChanged.connect(self.on_muscle_latin_item_changed)
        self.muscle_latin_list.setVerticalScrollMode(QListWidget.ScrollPerPixel)
        self.muscle_latin_list.setMinimumHeight(120)
        muscle_latin_column.addWidget(self.muscle_latin_list, 1)
        muscle_latin_add_row = QHBoxLayout()
        self.muscle_latin_add_input = QLineEdit()
        self.muscle_latin_add_input.setPlaceholderText("Neuer Muskel lat.")
        self.muscle_latin_add_button = QPushButton("Hinzufügen")
        self.muscle_latin_add_button.clicked.connect(self.add_manual_muscle_latin)
        muscle_latin_add_row.addWidget(self.muscle_latin_add_input)
        muscle_latin_add_row.addWidget(self.muscle_latin_add_button)
        muscle_latin_column.addLayout(muscle_latin_add_row)

        selector_layout.addLayout(category_column, 0, 0)
        selector_layout.addLayout(category_en_column, 0, 1)
        selector_layout.addLayout(muscle_column, 0, 2)
        selector_layout.addLayout(muscle_en_column, 0, 3)
        selector_layout.addLayout(muscle_latin_column, 0, 4)
        right_layout.addWidget(self.selector_box, 1)
        left_splitter.addWidget(bottom_left_widget)
        left_splitter.setStretchFactor(0, 0)
        left_splitter.setStretchFactor(1, 1)
        left_splitter.setSizes([160, 790])

        self.suggestion_box = QGroupBox("Vorschlag / Hinweise")
        self.suggestion_text = QTextEdit()
        self.suggestion_text.setReadOnly(True)

        self.summary_status_label = QLabel("Keine Daten geladen.")
        self.statusBar().addPermanentWidget(self.summary_status_label, 1)
        self.statusBar().showMessage("Bereit.")
        self._build_menu()
        main_splitter.setStretchFactor(0, 2)
        main_splitter.setStretchFactor(1, 1)
        main_splitter.setSizes([1200, 600])

    def _build_menu(self) -> None:
        file_menu = self.menuBar().addMenu("Datei")
        reveal_excel = QAction("Excel-Datei öffnen", self)
        reveal_excel.triggered.connect(lambda: self._open_path(self.excel_input.text()))
        reveal_excel.setStatusTip("Öffnet die aktuell eingestellte Excel-Masterdatei.")
        file_menu.addAction(reveal_excel)
        reveal_json = QAction("App-JSON öffnen", self)
        reveal_json.triggered.connect(lambda: self._open_path(self.json_input.text()))
        reveal_json.setStatusTip("Öffnet die aktuell eingestellte App-JSON-Datei.")
        file_menu.addAction(reveal_json)
        reveal_animations = QAction("Animationsordner öffnen", self)
        reveal_animations.triggered.connect(lambda: self._open_path(self.animations_input.text()))
        reveal_animations.setStatusTip("Öffnet den aktuell eingestellten Animationsordner.")
        file_menu.addAction(reveal_animations)
        self.save_action = QAction("Änderungen in Excel speichern", self)
        self.save_action.triggered.connect(self.save_current_entry)
        self.save_action.setStatusTip("Speichert die aktuellen Änderungen aus Bearbeiten oder Schnellzuweisung in die Excel-Datei.")
        file_menu.addAction(self.save_action)

        actions_menu = self.menuBar().addMenu("Aktionen")
        undo_action = QAction("Letzte Änderung rückgängig", self)
        undo_action.triggered.connect(self.undo_last_change)
        undo_action.setStatusTip("Stellt die zuletzt gespeicherte Änderung an Excel-Feldern wieder her.")
        actions_menu.addAction(undo_action)
        reload_action = QAction("Daten neu einlesen", self)
        reload_action.triggered.connect(self.load_data)
        reload_action.setStatusTip("Lädt Excel, App-JSON und Audit-Statistiken neu.")
        actions_menu.addAction(reload_action)
        export_action = QAction("Excel -> JSON exportieren", self)
        export_action.triggered.connect(self.export_json)
        export_action.setStatusTip("Erstellt die App-JSON und den Export-Report neu aus dem Excel-Master.")
        actions_menu.addAction(export_action)

        settings_menu = self.menuBar().addMenu("Einstellungen")
        path_action = QAction("Pfade...", self)
        path_action.triggered.connect(self.show_path_settings_dialog)
        path_action.setStatusTip("Bearbeitet Excel-, JSON-, Report- und Animationspfade.")
        settings_menu.addAction(path_action)
        ai_action = QAction("KI-Anbieter...", self)
        ai_action.triggered.connect(self.show_ai_settings_dialog)
        ai_action.setStatusTip("Konfiguriert den OpenAI-kompatiblen KI-Anbieter für bessere Vorschläge.")
        settings_menu.addAction(ai_action)
        background_menu = settings_menu.addMenu("Vorschau-Hintergrund")
        for label, mode in [("Dunkel", "dark"), ("Weiß", "light"), ("Transparent", "transparent")]:
            action = QAction(label, self)
            action.triggered.connect(lambda checked=False, m=mode: self.set_background_mode(m))
            background_menu.addAction(action)

        help_menu = self.menuBar().addMenu("Hilfe")
        show_guide = QAction("Anleitung", self)
        show_guide.triggered.connect(self.show_guide_dialog_v3)
        help_menu.addAction(show_guide)

    def _create_preview_webview(self, slot_name: str, register_main: bool = True) -> QWebEngineView:
        web = AuditPreviewWebView()
        channel = QWebChannel(web.page())
        bridge = LottieBridge(self)
        channel.registerObject("bridge", bridge)
        web.page().setWebChannel(channel)
        web.setHtml(HTML_TEMPLATE, QUrl("https://exercise.audit.tool/"))
        web._audit_channel = channel
        web._audit_bridge = bridge
        web.setContextMenuPolicy(Qt.CustomContextMenu)
        web.setProperty("auditPreviewSlot", slot_name)
        web.setProperty("auditPreviewIndex", None)
        web.customContextMenuRequested.connect(lambda pos, view=web: self.show_preview_context_menu(view, pos))
        web.leftClicked.connect(lambda view=web: self.on_preview_clicked(view))
        if register_main:
            self.preview_views.append(web)
        return web

    def _set_edit_scope_message(self, text: str = "") -> None:
        if text:
            self.edit_scope_label.setText(text)
            self.edit_scope_label.show()
            return
        self.edit_scope_label.clear()
        self.edit_scope_label.hide()

    def _make_gender_variant_group_key(self, indices: list[int]) -> str:
        if self.store is None or not indices:
            return ""
        names = [
            self.store.entries_by_index[index_value].values.get("name", "")
            for index_value in indices
            if index_value in self.store.entries_by_index
        ]
        base_name = normalize_name_key(names[0] if names else "gender_variant")
        base_name = base_name.replace("ä", "ae").replace("ö", "oe").replace("ü", "ue").replace("ß", "ss")
        base_name = "".join(char if char.isalnum() else "_" for char in base_name)
        base_name = "_".join(part for part in base_name.split("_") if part) or "gender_variant"
        sorted_indices = sorted(set(indices))
        return f"{base_name}__{sorted_indices[0]}_{sorted_indices[-1]}"

    def _load_config_into_inputs(self) -> None:
        self.excel_input.setText(self.config.excel_file)
        self.json_input.setText(self.config.app_json_file)
        self.animations_input.setText(self.config.animations_dir)
        self.report_input.setText(self.config.export_report_file)

    def _collect_config(self) -> AppConfig:
        return AppConfig(
            excel_file=self.excel_input.text().strip(),
            app_json_file=self.json_input.text().strip(),
            animations_dir=self.animations_input.text().strip(),
            export_report_file=self.report_input.text().strip(),
            ai_enabled=self.config.ai_enabled,
            ai_base_url=self.config.ai_base_url,
            ai_model=self.config.ai_model,
            ai_api_key=self.config.ai_api_key,
        )

    def save_config(self) -> None:
        self.config = self._collect_config()
        self.config_store.save_local(self.config)
        self.statusBar().showMessage("Pfade gespeichert.", 5000)

    @staticmethod
    def _resolve_backup_directory(path: Path) -> Path:
        if path.parent.name.casefold() == "backups":
            return path.parent
        return path.parent / "backups"

    def _dated_sibling_in_backups(self, path: Path, suffix: str = "") -> Path:
        date_label = datetime.now().strftime("%Y-%m-%d")
        backup_dir = self._resolve_backup_directory(path)
        backup_dir.mkdir(parents=True, exist_ok=True)
        return backup_dir / f"{path.stem}{suffix}_{date_label}{path.suffix}"

    def _resolve_report_output_path(self) -> Path:
        configured = Path(self.report_input.text().strip())
        date_label = datetime.now().strftime("%Y-%m-%d")
        target_dir = self._resolve_backup_directory(configured)
        target_dir.mkdir(parents=True, exist_ok=True)
        stem = configured.stem
        if stem.endswith(f"_{date_label}"):
            return target_dir / configured.name
        return target_dir / f"{stem}_{date_label}{configured.suffix}"

    def ensure_backup_for_path(self, path: Path) -> None:
        path = Path(path)
        if not path.exists() or path in self.created_backup_targets:
            return
        backup_path = self._dated_sibling_in_backups(path, "_backup")
        if not backup_path.exists():
            shutil.copy2(path, backup_path)
        self.created_backup_targets.add(path)

    def ensure_excel_backup(self) -> None:
        if self.excel_input.text().strip():
            self.ensure_backup_for_path(Path(self.excel_input.text().strip()))

    def ensure_json_backup(self) -> None:
        if self.json_input.text().strip():
            self.ensure_backup_for_path(Path(self.json_input.text().strip()))

    def set_background_mode(self, mode: str) -> None:
        index = self.preview_background_mode.findData(mode)
        if index >= 0:
            self.preview_background_mode.setCurrentIndex(index)
        self.apply_preview_background()

    def show_path_settings_dialog(self) -> None:
        dialog = QDialog(self)
        dialog.setWindowTitle("Pfade")
        form = QFormLayout(dialog)
        excel_input = QLineEdit(self.excel_input.text())
        json_input = QLineEdit(self.json_input.text())
        animations_input = QLineEdit(self.animations_input.text())
        report_input = QLineEdit(self.report_input.text())
        form.addRow("Excel-Master", excel_input)
        form.addRow("App-JSON", json_input)
        form.addRow("Animationsordner", animations_input)
        form.addRow("Export-Report", report_input)
        buttons = QDialogButtonBox(QDialogButtonBox.Ok | QDialogButtonBox.Cancel)
        buttons.accepted.connect(dialog.accept)
        buttons.rejected.connect(dialog.reject)
        form.addRow(buttons)
        dialog.resize(max(1200, self.width() * 3 // 4), 260)
        if dialog.exec():
            self.excel_input.setText(excel_input.text().strip())
            self.json_input.setText(json_input.text().strip())
            self.animations_input.setText(animations_input.text().strip())
            self.report_input.setText(report_input.text().strip())
            self.save_config()
            self.load_data()

    def show_ai_settings_dialog(self) -> None:
        dialog = QDialog(self)
        dialog.setWindowTitle("KI-Anbieter")
        form = QFormLayout(dialog)
        enabled_input = QCheckBox("KI-Vorschlaege aktivieren")
        enabled_input.setChecked(self.config.ai_enabled)
        base_url_input = QLineEdit(self.config.ai_base_url)
        model_input = QLineEdit(self.config.ai_model)
        api_key_input = QLineEdit(self.config.ai_api_key)
        api_key_input.setEchoMode(QLineEdit.Password)
        form.addRow(enabled_input)
        form.addRow("Base URL", base_url_input)
        form.addRow("Model", model_input)
        form.addRow("API-Key", api_key_input)
        buttons = QDialogButtonBox(QDialogButtonBox.Ok | QDialogButtonBox.Cancel)
        buttons.accepted.connect(dialog.accept)
        buttons.rejected.connect(dialog.reject)
        form.addRow(buttons)
        if dialog.exec():
            self.config.ai_enabled = enabled_input.isChecked()
            self.config.ai_base_url = base_url_input.text().strip() or "https://api.openai.com/v1"
            self.config.ai_model = model_input.text().strip() or "gpt-4.1-mini"
            self.config.ai_api_key = api_key_input.text().strip()
            self.save_config()

    def load_data(self) -> None:
        self.config = self._collect_config()
        try:
            animations_dir = Path(self.config.animations_dir) if self.config.animations_dir else None
            self.store = WorkbookAuditStore(Path(self.config.excel_file), animations_dir)
            self.store.load()
            self.store.load_app_json_snapshot(Path(self.config.app_json_file) if self.config.app_json_file else None)
        except Exception as exc:
            self.store = None
            self.table.setRowCount(0)
            self.summary_status_label.setText("Fehler beim Laden.")
            self.statusBar().showMessage("Fehler beim Laden.")
            QMessageBox.critical(self, "Ladefehler", str(exc))
            return

        self.refresh_table()
        duplicate_count = len([entry for entry in self.store.entries if entry.duplicate_name_count > 1])
        suspicious_count = len([entry for entry in self.store.entries if entry.suspicious_name])
        json_mismatch_count = len([entry for entry in self.store.entries if entry.json_mismatch])
        equipment_conflict_count = len([entry for entry in self.store.entries if entry.equipment_conflict])
        self.category_map = dict(self.store.available_category_pairs())
        self.muscle_map = dict(self.store.available_muscle_pairs())
        self.category_en_values = sorted({value for value in self.category_map.values() if value}, key=str.casefold)
        self.muscle_en_values = sorted({value for value in self.muscle_map.values() if value}, key=str.casefold)
        self.muscle_latin_values = sorted(
            {
                item.strip()
                for entry in self.store.entries
                for item in entry.values.get("musclesLatin", "").split(";")
                if item.strip()
            },
            key=str.casefold,
        )
        self.populate_selector_lists()
        selected = self.selected_indices()
        if selected:
            self.load_selection(selected)
        self.summary_status_label.setText(
            f"{len(self.store.entries)} Übungen geladen | {duplicate_count} mit Dublettenamen | "
            f"{suspicious_count} verdächtige Namen | {json_mismatch_count} JSON-Abweichungen | "
            f"{equipment_conflict_count} Kategorie-Konflikte"
        )
        self.statusBar().showMessage("Daten geladen.", 5000)
        self.apply_preview_background()

    def refresh_table(self) -> None:
        if self.store is None:
            return
        rows = self._visible_rows()
        self.table.setSortingEnabled(False)
        self.table.setRowCount(len(rows))
        for row_index, row in enumerate(rows):
            entry = row["entry"]
            values = [
                row["index_text"],
                row["name_text"],
                entry.values.get("nameEn", ""),
                row["duplicate_text"],
                row["status_text"],
                row.get("pack_text", ""),
                row.get("author_text", ""),
                entry.values.get("originalName", ""),
            ]
            for col_index, value in enumerate(values):
                item = QTableWidgetItem(value)
                if col_index == 0:
                    item.setData(Qt.UserRole, row["indices"])
                    try:
                        item.setData(Qt.EditRole, int(row["index_text"]))
                    except Exception:
                        item.setData(Qt.EditRole, value)
                elif col_index == 3:
                    try:
                        item.setData(Qt.EditRole, int(row["duplicate_text"]))
                    except Exception:
                        item.setData(Qt.EditRole, value)
                else:
                    item.setData(Qt.EditRole, value)
                if col_index in (1, 2, 5, 6, 7) and value:
                    item.setToolTip(str(value))
                elif col_index == 4:
                    item.setToolTip(self._status_tooltip_for_row(row))
                self.table.setItem(row_index, col_index, item)
        self.table.resizeColumnsToContents()
        self.table.setSortingEnabled(True)
        if rows:
            self.table.selectRow(0)
        else:
            self._clear_editor()

    def _visible_rows(self) -> list[dict[str, object]]:
        assert self.store is not None
        filter_mode = self.filter_mode.currentData()
        search_text = self.search_input.text()
        entries = [] if filter_mode in {"gender_variant_candidates", "gender_variant_pairs"} else self.store.table_rows(filter_mode, search_text)
        mode = self.view_mode.currentData()
        if mode == "gender_variant_pairs" or filter_mode == "gender_variant_pairs":
            text = normalize_name_key(search_text)
            rows: list[dict[str, object]] = []
            for group_entries in self.store.gender_variant_pair_groups():
                representative = group_entries[0]
                haystack = " | ".join(
                    [
                        str(item.index)
                        + " "
                        + item.values.get("name", "")
                        + " "
                        + item.values.get("nameEn", "")
                        + " "
                        + item.values.get("gender", "")
                        + " "
                        + item.values.get("genderVariantGroup", "")
                        for item in group_entries
                    ]
                )
                if text and text not in normalize_name_key(haystack):
                    continue
                rows.append(
                    {
                        "entry": representative,
                        "indices": [item.index for item in group_entries],
                        "index_text": str(representative.index),
                        "name_text": representative.values.get("name", ""),
                        "author_text": self._common_value(group_entries, "author"),
                        "pack_text": self._common_value(group_entries, "packName"),
                        "duplicate_text": str(len(group_entries)),
                        "status_text": "Gender-Paar | m/w",
                        "group_reason": (
                            "Hier gibt es bereits ein klares Mann/Frau-Paar: gleicher deutscher Name, "
                            "genau zwei Einträge, einer mit 'm' und einer mit 'w', beide mit derselben "
                            "Gender-Variante Gruppe."
                        ),
                    }
                )
            return sorted(rows, key=lambda item: int(item["indices"][0]))
        if mode == "gender_variant_candidates" or filter_mode == "gender_variant_candidates":
            text = normalize_name_key(search_text)
            rows: list[dict[str, object]] = []
            for group_entries in self.store.gender_variant_candidate_groups():
                representative = group_entries[0]
                haystack = " | ".join(
                    [
                        str(item.index)
                        + " "
                        + item.values.get("name", "")
                        + " "
                        + item.values.get("nameEn", "")
                        + " "
                        + item.values.get("gender", "")
                        + " "
                        + item.values.get("genderVariantGroup", "")
                        for item in group_entries
                    ]
                )
                if text and text not in normalize_name_key(haystack):
                    continue
                gender_summary = "/".join(sorted({item.values.get("gender", "").strip() for item in group_entries if item.values.get("gender", "").strip()}))
                rows.append(
                    {
                        "entry": representative,
                        "indices": [item.index for item in group_entries],
                        "index_text": str(representative.index),
                        "name_text": representative.values.get("name", ""),
                        "author_text": self._common_value(group_entries, "author"),
                        "pack_text": self._common_value(group_entries, "packName"),
                        "duplicate_text": str(len(group_entries)),
                        "status_text": f"Gender-Kandidat | {gender_summary or 'ohne Gender'}",
                        "group_reason": (
                            "Hier gibt es mehrere Einträge mit demselben deutschen Namen und gemischten "
                            "Gender-Werten. Die Gruppe ist noch nicht eindeutig, zum Beispiel weil mehr als "
                            "zwei Einträge vorhanden sind oder weil noch nicht klar markiert ist, welche "
                            "Einträge wirklich als Mann/Frau-Paar zusammengehören."
                        ),
                    }
                )
            return sorted(rows, key=lambda item: int(item["indices"][0]))
        if mode == "duplicate_groups":
            groups: dict[str, list] = {}
            for entry in entries:
                key = normalize_name_key(entry.values.get("name", "")) or f"index:{entry.index}"
                groups.setdefault(key, []).append(entry)
            rows: list[dict[str, object]] = []
            for group_entries in groups.values():
                if len(group_entries) < 2 or all(item.duplicate_name_count <= 1 for item in group_entries):
                    continue
                representative = sorted(group_entries, key=lambda item: item.index)[0]
                rows.append(
                    {
                        "entry": representative,
                        "indices": [item.index for item in sorted(group_entries, key=lambda item: item.index)],
                        "index_text": str(representative.index),
                        "name_text": representative.values.get("name", ""),
                        "author_text": self._common_value(group_entries, "author"),
                        "pack_text": self._common_value(group_entries, "packName"),
                        "duplicate_text": str(len(group_entries)),
                        "status_text": f"Dubletten-Gruppe | {self._duplicate_animation_summary([item.index for item in group_entries])[0]}",
                    }
                )
            return sorted(rows, key=lambda item: int(item["indices"][0]))
        if mode == "equipment_groups":
            groups: dict[str, list] = {}
            for entry in entries:
                if not entry.equipment_conflict:
                    continue
                key = entry.equipment_conflict_reason or "Kategorie prüfen"
                groups.setdefault(key, []).append(entry)
            rows = []
            for reason, group_entries in groups.items():
                representative = sorted(group_entries, key=lambda item: item.index)[0]
                rows.append(
                    {
                        "entry": representative,
                        "indices": [item.index for item in sorted(group_entries, key=lambda item: item.index)],
                        "index_text": str(representative.index),
                        "name_text": representative.values.get("name", ""),
                        "author_text": self._common_value(group_entries, "author"),
                        "pack_text": self._common_value(group_entries, "packName"),
                        "duplicate_text": str(len(group_entries)),
                        "status_text": "Kategorie-Konflikt-Gruppe",
                        "group_reason": reason,
                    }
                )
            return sorted(rows, key=lambda item: int(item["indices"][0]))

        return [
            {
                "entry": entry,
                "indices": [entry.index],
                "index_text": str(entry.index),
                "name_text": entry.values.get("name", ""),
                "author_text": entry.values.get("author", ""),
                "pack_text": entry.values.get("packName", ""),
                "duplicate_text": str(entry.duplicate_name_count),
                "status_text": entry.status_text,
            }
            for entry in entries
        ]

    @staticmethod
    def _common_value(entries: list, field_name: str) -> str:
        values = {str(entry.values.get(field_name, "")).strip() for entry in entries if str(entry.values.get(field_name, "")).strip()}
        return next(iter(values)) if len(values) == 1 else ""

    def _status_tooltip_for_row(self, row: dict[str, object]) -> str:
        entry = row["entry"]
        indices = row["indices"]
        lines: list[str] = ["Status"]
        flags = entry.status_flags if len(indices) == 1 else sorted({flag for index_value in indices for flag in self.store.entries_by_index[index_value].status_flags})
        explanations = {
            "OK": "Excel und App-JSON stimmen überein.",
            "Duplikatname": "Derselbe deutsche Name kommt mehrfach vor.",
            "Verdächtiger Name": "Name wirkt automatisch erzeugt oder sprachlich schief.",
            "JSON abweichend": "Excel-Master und App-JSON unterscheiden sich in mindestens einem Feld.",
            "Kategorie prüfen": "'ohne Gerät' passt vermutlich nicht zur Übung.",
            "Animation fehlt": "Für den Index wurde keine Lottie-Datei gefunden.",
        }
        for flag in flags:
            lines.append("")
            lines.append(flag)
            lines.append(explanations.get(flag, ""))
        if len(indices) == 1:
            if entry.json_mismatch_fields:
                lines.append("")
                lines.append("Abweichende Felder")
                lines.append(", ".join(entry.json_mismatch_fields))
            if entry.duplicate_name_count > 1:
                lines.append("")
                lines.append("Duplikat-Indizes")
                lines.append(", ".join(str(item.index) for item in self.store.duplicate_group_for(entry.index)))
            if entry.equipment_conflict_reason:
                lines.append("")
                lines.append("Hinweis")
                lines.append(entry.equipment_conflict_reason)
        else:
            if row.get("group_reason"):
                lines.append("")
                lines.append("Konflikt-Hinweis")
                lines.append(str(row["group_reason"]))
            lines.append("")
            lines.append("Betroffene Indizes")
            lines.append(", ".join(str(index_value) for index_value in indices[:18]) + (" ..." if len(indices) > 18 else ""))
        return "\n".join(lines).strip()

    def _status_meaning_tooltip(self, flags: list[str]) -> str:
        explanations = {
            "OK": "Excel und App-JSON stimmen überein.",
            "Duplikatname": "Derselbe deutsche Name kommt mehrfach vor.",
            "Verdächtiger Name": "Name wirkt automatisch erzeugt oder sprachlich schief.",
            "JSON abweichend": "Excel-Master und App-JSON unterscheiden sich in mindestens einem Feld.",
            "Kategorie prüfen": "'ohne Gerät' passt vermutlich nicht zur Übung.",
            "Animation fehlt": "Für den Index wurde keine Lottie-Datei gefunden.",
        }
        lines = ["Status-Bedeutung"]
        for flag in flags:
            lines.append("")
            lines.append(flag)
            lines.append(explanations.get(flag, ""))
        return "\n".join(lines).strip()

    def _duplicate_animation_summary(self, indices: list[int]) -> tuple[str, list[int]]:
        if self.store is None or len(indices) <= 1:
            return "—", []
        signatures: dict[str, list[int]] = {}
        missing: list[int] = []
        for index_value in indices:
            signature = self.store.animation_signature_for(index_value)
            if not signature:
                missing.append(index_value)
                continue
            signatures.setdefault(signature, []).append(index_value)
        identical_groups = [group for group in signatures.values() if len(group) > 1]
        if len(signatures) == 1 and not missing:
            return "Alle identisch", indices
        if identical_groups:
            return f"Teilweise identisch ({len(identical_groups)} Gruppen)", identical_groups[0]
        if missing:
            return "Teilweise fehlend", []
        return "Unterschiedlich", []

    def _show_duplicate_previews(self, primary_index: int, indices: list[int]) -> None:
        summary, _preview_indices = self._duplicate_animation_summary(indices)
        self.meta_animation_group.setText(summary)
        self.quick_preview_index_label.setText(str(primary_index))
        self.quick_preview.setProperty("auditPreviewIndex", primary_index)
        if len(indices) <= 1:
            self._set_preview_split_single()
            for label in self.compare_preview_index_labels:
                label.setText("—")
            for idx, container in enumerate(self.compare_preview_containers):
                self.compare_preview_views[idx].setProperty("auditPreviewIndex", None)
                container.hide()
            return
        remaining_indices = [index_value for index_value in indices if index_value != primary_index]
        show_indices = remaining_indices[: len(self.compare_preview_views)]
        if not show_indices:
            self._set_preview_split_single()
            for label in self.compare_preview_index_labels:
                label.setText("—")
            for idx, container in enumerate(self.compare_preview_containers):
                self.compare_preview_views[idx].setProperty("auditPreviewIndex", None)
                container.hide()
            return
        self._set_preview_split_equal()
        mode = self.preview_background_mode.currentData()
        for idx, view in enumerate(self.compare_preview_views):
            if idx < len(show_indices):
                self.compare_preview_index_labels[idx].setText(str(show_indices[idx]))
                self.compare_preview_views[idx].setProperty("auditPreviewIndex", show_indices[idx])
                self.compare_preview_containers[idx].show()
                view.page().runJavaScript(f"window.openAnimationIndex({show_indices[idx]});")
                view.page().runJavaScript(f"window.setAuditBackground('{mode}');")
            else:
                self.compare_preview_index_labels[idx].setText("—")
                self.compare_preview_views[idx].setProperty("auditPreviewIndex", None)
                self.compare_preview_containers[idx].hide()

    def _set_preview_split_single(self) -> None:
        self.bottom_preview_widget.setMaximumHeight(0)
        self.preview_splitter.setSizes([1, 0])
        QTimer.singleShot(0, lambda: self.preview_splitter.setSizes([max(1, self.preview_splitter.height()), 0]))

    def _set_preview_split_equal(self) -> None:
        self.bottom_preview_widget.setMaximumHeight(16777215)
        self.preview_splitter.setSizes([1, 1])

        def rebalance() -> None:
            total = max(2, self.preview_splitter.height())
            half = total // 2
            self.preview_splitter.setSizes([half, total - half])

        QTimer.singleShot(0, rebalance)

    def populate_selector_lists(self) -> None:
        self._updating_selectors = True
        for widget, values in [
            (self.category_list, list(self.category_map.keys())),
            (self.category_en_list, self.category_en_values),
            (self.muscle_list, list(self.muscle_map.keys())),
            (self.muscle_en_list, self.muscle_en_values),
            (self.muscle_latin_list, self.muscle_latin_values),
        ]:
            widget.clear()
            for value in values:
                item = QListWidgetItem(value)
                item.setFlags(item.flags() | Qt.ItemIsUserCheckable | Qt.ItemIsUserTristate)
                item.setCheckState(Qt.Unchecked)
                widget.addItem(item)
        self._updating_selectors = False

    def _clear_editor(self) -> None:
        self.current_index = None
        self.current_preview_indices = []
        self.explicit_edit_index = None
        self.meta_index.setText("—")
        self.meta_author.setText("—")
        self.meta_pack.setText("—")
        self.meta_original.setText("—")
        self.meta_animation.setText("—")
        self.meta_animation_group.setText("—")
        self.quick_preview_index_label.setText("—")
        for label in self.compare_preview_index_labels:
            label.setText("—")
        for container in self.compare_preview_containers:
            container.hide()
        for widget in self.field_inputs.values():
            if isinstance(widget, QLineEdit):
                widget.setText("")
            elif isinstance(widget, QComboBox):
                widget.setCurrentIndex(0)
            else:
                widget.setPlainText("")
        self._sync_selector_states({}, multi=False)
        self.suggestion_text.clear()
        self.suggestion_text.setToolTip("")
        self.suggestion_box.setToolTip("")
        self._set_edit_scope_message("")
        self._set_editor_enabled(False)
        self._update_suggest_button_label([])
        self._reset_preview_views()

    def _sync_selector_states(self, field_values: dict[str, list[str]], multi: bool = False) -> None:
        self._updating_selectors = True
        selector_map = {
            "categories": self.category_list,
            "categoriesEn": self.category_en_list,
            "muscles": self.muscle_list,
            "musclesEn": self.muscle_en_list,
            "musclesLatin": self.muscle_latin_list,
        }
        for field_name, widget in selector_map.items():
            values = {value.casefold() for value in field_values.get(field_name, [])}
            partial_values = {value.casefold() for value in field_values.get(f"{field_name}__partial", [])} if multi else set()
            for idx in range(widget.count()):
                item = widget.item(idx)
                key = item.text().casefold()
                if key in partial_values:
                    item.setCheckState(Qt.PartiallyChecked)
                else:
                    item.setCheckState(Qt.Checked if key in values else Qt.Unchecked)
        self._updating_selectors = False

    def _sync_selector_states_multi(self, entries: list) -> None:
        selector_map = {
            "categories": self.category_list,
            "categoriesEn": self.category_en_list,
            "muscles": self.muscle_list,
            "musclesEn": self.muscle_en_list,
            "musclesLatin": self.muscle_latin_list,
        }
        total = len(entries)
        state_payload: dict[str, list[str]] = {}
        for field_name, widget in selector_map.items():
            checked_values: list[str] = []
            partial_values: list[str] = []
            for idx in range(widget.count()):
                item = widget.item(idx)
                matches = 0
                for entry in entries:
                    values = {value.casefold() for value in self.field_text_list(entry.values.get(field_name, ""))}
                    if item.text().casefold() in values:
                        matches += 1
                if matches == total:
                    checked_values.append(item.text())
                elif matches > 0:
                    partial_values.append(item.text())
            state_payload[field_name] = checked_values
            state_payload[f"{field_name}__partial"] = partial_values
        self._sync_selector_states(state_payload, multi=True)

    def _set_editor_enabled(self, enabled: bool) -> None:
        self.fields_box.setEnabled(enabled)
        if hasattr(self, "save_action"):
            self.save_action.setEnabled(enabled)

    @staticmethod
    def field_text_list(value: str) -> list[str]:
        return [item.strip() for item in value.split(";") if item.strip()]

    def _toggle_single_text_list(self, field_name: str, value: str, checked: bool) -> None:
        current_values = self.field_text_list(self.field_inputs[field_name].text())
        lowered = [item.casefold() for item in current_values]
        if checked:
            if value.casefold() not in lowered:
                current_values.append(value)
        else:
            current_values = [item for item in current_values if item.casefold() != value.casefold()]
        self.field_inputs[field_name].setText("; ".join(current_values))

    def _update_suggest_button_label(self, indices: list[int]) -> None:
        return

    def on_table_selection_changed(self) -> None:
        if self.store is None:
            return
        rows = [index.row() for index in self.table.selectionModel().selectedRows()]
        if not rows:
            return
        selected_indices: list[int] = []
        seen: set[int] = set()
        for row in rows:
            first_item = self.table.item(row, 0)
            if not first_item:
                continue
            for index_value in first_item.data(Qt.UserRole) or []:
                if index_value not in seen:
                    seen.add(index_value)
                    selected_indices.append(index_value)
        self.load_selection(selected_indices)

    def load_selection(self, indices: list[int]) -> None:
        if self.store is None or not indices:
            return
        entries = [self.store.entries_by_index[index_value] for index_value in indices if index_value in self.store.entries_by_index]
        if not entries:
            return
        self.explicit_edit_index = None
        self._set_edit_scope_message("")
        self.current_selection_indices = list(indices)
        self.current_preview_indices = list(indices)
        self.pending_multi_assignments = {}
        self._update_suggest_button_label(indices)
        if len(entries) == 1:
            self.load_entry(entries[0].index)
            return

        first_entry = entries[0]
        self._show_duplicate_previews(first_entry.index, indices)
        self.current_index = None
        self.meta_index.setText(f"{len(entries)} ausgewählt")
        self.meta_author.setText("—")
        self.meta_pack.setText("—")
        self.meta_original.setText("—")
        self.meta_animation.setText(str(self.store.animation_path_for(first_entry.index)))
        self.quick_preview_index_label.setText(str(first_entry.index))
        for widget in self.field_inputs.values():
            if isinstance(widget, QLineEdit):
                widget.setText("")
            elif isinstance(widget, QComboBox):
                widget.setCurrentIndex(0)
            else:
                widget.setPlainText("")
        self._set_editor_enabled(False)
        self._sync_selector_states_multi(entries)
        self._open_preview_index(first_entry.index)
        status_counter: dict[str, int] = {}
        for entry in entries:
            for flag in entry.status_flags:
                status_counter[flag] = status_counter.get(flag, 0) + 1
        self.suggestion_text.setPlainText(
            f"Mehrfachauswahl: {len(entries)} Übungen\n"
            f"Indizes: {', '.join(str(entry.index) for entry in entries[:12])}"
            + (" ..." if len(entries) > 12 else "")
            + "\n\n"
            "Schnellzuweisung ist aktiv.\n"
            "Bearbeiten ist bei Mehrfachauswahl deaktiviert.\n"
            "Änderungen per Schnellzuweisung werden sofort in Excel gespeichert."
        )
        self.suggestion_text.setPlainText(
            f"Mehrfachauswahl: {len(entries)} Übungen\n"
            f"Indizes: {', '.join(str(entry.index) for entry in entries[:12])}"
            + (" ..." if len(entries) > 12 else "")
            + "\n\n"
            "Änderungen aus der Schnellzuweisung werden erst mit 'Änderungen in Excel speichern' übernommen."
        )
        selection_row = {
            "entry": first_entry,
            "indices": [entry.index for entry in entries],
        }
        status_tooltip = self._status_meaning_tooltip(sorted(status_counter.keys()) or ["OK"])
        self.suggestion_text.setToolTip(status_tooltip)
        self.suggestion_box.setToolTip(status_tooltip)

    def load_entry(self, index_value: int) -> None:
        if self.store is None:
            return
        entry = self.store.entries_by_index[index_value]
        self.current_index = index_value
        self._set_editor_enabled(True)
        self._update_suggest_button_label([index_value])
        duplicate_indices = [item.index for item in self.store.duplicate_group_for(index_value)]
        self.current_preview_indices = list(duplicate_indices or [index_value])
        self._show_duplicate_previews(index_value, duplicate_indices)
        self.meta_index.setText(str(entry.index))
        self.meta_author.setText(entry.values.get("author", ""))
        self.meta_pack.setText(entry.values.get("packName", ""))
        self.meta_original.setText(entry.values.get("originalName", ""))
        self.meta_animation.setText(str(self.store.animation_path_for(entry.index)))

        for field_name, widget in self.field_inputs.items():
            value = entry.values.get(field_name, "")
            if isinstance(widget, QLineEdit):
                widget.setText(value)
            elif isinstance(widget, QComboBox):
                widget.setCurrentIndex(max(0, widget.findData(value)))
            else:
                widget.setPlainText(value)
        self._sync_selector_states(
            {
                "categories": self.field_text_list(entry.values.get("categories", "")),
                "categoriesEn": self.field_text_list(entry.values.get("categoriesEn", "")),
                "muscles": self.field_text_list(entry.values.get("muscles", "")),
                "musclesEn": self.field_text_list(entry.values.get("musclesEn", "")),
                "musclesLatin": self.field_text_list(entry.values.get("musclesLatin", "")),
            }
        )

        explanation_lines = [f"Status: {entry.status_text}"]
        if entry.json_mismatch_fields:
            explanation_lines.append("App-JSON abweichend in: " + ", ".join(entry.json_mismatch_fields))
        if entry.duplicate_name_count > 1:
            explanation_lines.append(f"Dieser DE-Name kommt {entry.duplicate_name_count}x vor.")
            group = self.store.duplicate_group_for(entry.index)
            explanation_lines.append("Duplikat-Indizes: " + ", ".join(str(item.index) for item in group))
        if entry.suspicious_name:
            explanation_lines.append("Der Name wirkt automatisch erzeugt oder sollte sprachlich geprüft werden.")
        if entry.equipment_conflict_reason:
            explanation_lines.append("Kategorie-Hinweis: " + entry.equipment_conflict_reason)
        self.suggestion_text.setPlainText("\n".join(explanation_lines))
        status_tooltip = self._status_meaning_tooltip(entry.status_flags)
        self.suggestion_text.setToolTip(status_tooltip)
        self.suggestion_box.setToolTip(status_tooltip)
        self._open_preview_index(entry.index)

    def _toggle_text_list(self, de_field: str, en_field: str, de_value: str, en_value: str, checked: bool) -> None:
        new_de, new_en = toggle_list_value(
            self.field_inputs[de_field].text(),
            self.field_inputs[en_field].text(),
            de_value,
            en_value,
            checked,
        )
        self.field_inputs[de_field].setText(new_de)
        self.field_inputs[en_field].setText(new_en)

    def _apply_list_toggle_to_selection(self, de_field: str, en_field: str, de_value: str, en_value: str, checked: bool) -> None:
        if self.store is None:
            return
        indices = self.selected_indices()
        if not indices:
            return
        if len(indices) == 1 and self.current_index is not None:
            self._toggle_text_list(de_field, en_field, de_value, en_value, checked)
            self._sync_selector_states(
                {
                    "categories": self.field_text_list(self.field_inputs["categories"].text()),
                    "categoriesEn": self.field_text_list(self.field_inputs["categoriesEn"].text()),
                    "muscles": self.field_text_list(self.field_inputs["muscles"].text()),
                    "musclesEn": self.field_text_list(self.field_inputs["musclesEn"].text()),
                    "musclesLatin": self.field_text_list(self.field_inputs["musclesLatin"].text()),
                }
            )
            return
        self.pending_multi_assignments[(de_field, en_field, de_value)] = checked
        self.statusBar().showMessage("Mehrfachauswahl geändert. Zum Übernehmen 'Änderungen in Excel speichern' klicken.", 5000)

    def _apply_simple_list_toggle_to_selection(self, field_name: str, value: str, checked: bool) -> None:
        if self.store is None:
            return
        indices = self.selected_indices()
        if not indices:
            return
        if len(indices) == 1 and self.current_index is not None:
            self._toggle_single_text_list(field_name, value, checked)
            self._sync_selector_states(
                {
                    "categories": self.field_text_list(self.field_inputs["categories"].text()),
                    "categoriesEn": self.field_text_list(self.field_inputs["categoriesEn"].text()),
                    "muscles": self.field_text_list(self.field_inputs["muscles"].text()),
                    "musclesEn": self.field_text_list(self.field_inputs["musclesEn"].text()),
                    "musclesLatin": self.field_text_list(self.field_inputs["musclesLatin"].text()),
                }
            )
            return
        self.pending_multi_assignments[(field_name, "", value)] = checked
        self.statusBar().showMessage("Mehrfachauswahl geändert. Zum Übernehmen 'Änderungen in Excel speichern' klicken.", 5000)

    def on_category_item_changed(self, item: QListWidgetItem) -> None:
        if self._updating_selectors:
            return
        if item.checkState() == Qt.PartiallyChecked:
            return
        self._apply_list_toggle_to_selection("categories", "categoriesEn", item.text(), self.category_map.get(item.text(), ""), item.checkState() == Qt.Checked)

    def on_muscle_item_changed(self, item: QListWidgetItem) -> None:
        if self._updating_selectors:
            return
        if item.checkState() == Qt.PartiallyChecked:
            return
        self._apply_list_toggle_to_selection("muscles", "musclesEn", item.text(), self.muscle_map.get(item.text(), ""), item.checkState() == Qt.Checked)

    def on_category_en_item_changed(self, item: QListWidgetItem) -> None:
        if self._updating_selectors or item.checkState() == Qt.PartiallyChecked:
            return
        self._apply_simple_list_toggle_to_selection("categoriesEn", item.text(), item.checkState() == Qt.Checked)

    def on_muscle_en_item_changed(self, item: QListWidgetItem) -> None:
        if self._updating_selectors or item.checkState() == Qt.PartiallyChecked:
            return
        self._apply_simple_list_toggle_to_selection("musclesEn", item.text(), item.checkState() == Qt.Checked)

    def on_muscle_latin_item_changed(self, item: QListWidgetItem) -> None:
        if self._updating_selectors or item.checkState() == Qt.PartiallyChecked:
            return
        self._apply_simple_list_toggle_to_selection("musclesLatin", item.text(), item.checkState() == Qt.Checked)

    def add_manual_category(self) -> None:
        value = self.category_add_input.text().strip()
        if not value:
            return
        if value not in self.category_map:
            self.category_map[value] = ""
            self.populate_selector_lists()
        self._apply_list_toggle_to_selection("categories", "categoriesEn", value, self.category_map.get(value, ""), True)
        self.category_add_input.clear()

    def add_manual_muscle(self) -> None:
        value = self.muscle_add_input.text().strip()
        if not value:
            return
        if value not in self.muscle_map:
            self.muscle_map[value] = ""
            self.populate_selector_lists()
        self._apply_list_toggle_to_selection("muscles", "musclesEn", value, self.muscle_map.get(value, ""), True)
        self.muscle_add_input.clear()

    def add_manual_category_en(self) -> None:
        value = self.category_en_add_input.text().strip()
        if not value:
            return
        if value not in self.category_en_values:
            self.category_en_values.append(value)
            self.category_en_values.sort(key=str.casefold)
            self.populate_selector_lists()
        self._apply_simple_list_toggle_to_selection("categoriesEn", value, True)
        self.category_en_add_input.clear()

    def add_manual_muscle_en(self) -> None:
        value = self.muscle_en_add_input.text().strip()
        if not value:
            return
        if value not in self.muscle_en_values:
            self.muscle_en_values.append(value)
            self.muscle_en_values.sort(key=str.casefold)
            self.populate_selector_lists()
        self._apply_simple_list_toggle_to_selection("musclesEn", value, True)
        self.muscle_en_add_input.clear()

    def add_manual_muscle_latin(self) -> None:
        value = self.muscle_latin_add_input.text().strip()
        if not value:
            return
        if value not in self.muscle_latin_values:
            self.muscle_latin_values.append(value)
            self.muscle_latin_values.sort(key=str.casefold)
            self.populate_selector_lists()
        self._apply_simple_list_toggle_to_selection("musclesLatin", value, True)
        self.muscle_latin_add_input.clear()

    def _field_values(self) -> dict[str, str]:
        payload: dict[str, str] = {}
        for field_name, widget in self.field_inputs.items():
            if isinstance(widget, QLineEdit):
                payload[field_name] = widget.text().strip()
            elif isinstance(widget, QComboBox):
                payload[field_name] = str(widget.currentData() or "").strip()
            else:
                payload[field_name] = widget.toPlainText().strip()
        return payload

    def save_current_entry(self) -> None:
        if self.store is None:
            return
        if self.current_index is None and len(self.current_selection_indices) > 1:
            updates: dict[int, dict[str, str]] = {}
            for index_value in self.current_selection_indices:
                entry = self.store.entries_by_index.get(index_value)
                if not entry:
                    continue
                updated_values = {
                    "categories": entry.values.get("categories", ""),
                    "categoriesEn": entry.values.get("categoriesEn", ""),
                    "muscles": entry.values.get("muscles", ""),
                    "musclesEn": entry.values.get("musclesEn", ""),
                    "musclesLatin": entry.values.get("musclesLatin", ""),
                }
                for (de_field, en_field, de_value), checked in self.pending_multi_assignments.items():
                    if en_field:
                        en_value = self.category_map.get(de_value, "") if de_field == "categories" else self.muscle_map.get(de_value, "")
                        new_de, new_en = toggle_list_value(
                            updated_values.get(de_field, ""),
                            updated_values.get(en_field, ""),
                            de_value,
                            en_value,
                            checked,
                        )
                        updated_values[de_field] = new_de
                        updated_values[en_field] = new_en
                    else:
                        current_values = self.field_text_list(updated_values.get(de_field, ""))
                        lowered = [item.casefold() for item in current_values]
                        if checked:
                            if de_value.casefold() not in lowered:
                                current_values.append(de_value)
                        else:
                            current_values = [item for item in current_values if item.casefold() != de_value.casefold()]
                        updated_values[de_field] = "; ".join(current_values)
                updates[index_value] = updated_values
            if not self.pending_multi_assignments:
                self.statusBar().showMessage("Keine ausstehenden Änderungen zum Speichern.", 5000)
                return
            snapshot = self.store.snapshot_entries(self.current_selection_indices, ["categories", "categoriesEn", "muscles", "musclesEn", "musclesLatin"])
            self.ensure_excel_backup()
            try:
                changed = self.store.save_entries_bulk(updates)
            except Exception as exc:
                QMessageBox.critical(self, "Speicherfehler", str(exc))
                return
            if changed:
                self.undo_stack.append({"indices": list(changed), "snapshot": snapshot, "label": "Mehrfachauswahl gespeichert"})
            self.pending_multi_assignments = {}
            self.load_data()
            self._reselect_indices(self.current_selection_indices)
            self.statusBar().showMessage(f"{len(changed)} Übungen gespeichert.", 5000)
            return
        if self.current_index is None:
            return
        snapshot = self.store.snapshot_entries([self.current_index], list(self._field_values().keys()))
        self.ensure_excel_backup()
        try:
            updated = self.store.save_entry(self.current_index, self._field_values())
        except Exception as exc:
            QMessageBox.critical(self, "Speicherfehler", str(exc))
            return
        self.undo_stack.append({"indices": [updated.index], "snapshot": snapshot, "label": f"Index {updated.index} gespeichert"})
        self.statusBar().showMessage(f"Index {updated.index} gespeichert.", 5000)
        self.load_data()
        self._select_index(updated.index)

    def _build_suggestion(self, entry) -> dict[str, str]:
        try:
            if self.config.ai_enabled:
                suggestion = ai_name_suggestion(entry, self.config, self.store.animation_path_for(entry.index))
            else:
                suggestion = local_name_suggestion(entry)
        except Exception as exc:
            suggestion = local_name_suggestion(entry)
            suggestion["reason"] = f"KI-Fallback auf lokale Heuristik: {exc}"
        return suggestion

    def _build_bulk_suggestions(self, entries: list) -> dict[int, dict[str, str]]:
        if not entries:
            return {}
        try:
            if self.config.ai_enabled:
                return ai_bulk_suggestions(
                    entries,
                    self.config,
                    {entry.index: self.store.animation_path_for(entry.index) for entry in entries},
                )
        except Exception as exc:
            fallback = {entry.index: local_full_suggestion(entry) for entry in entries}
            for payload in fallback.values():
                payload["reason"] = f"KI-Fallback auf lokale Heuristik: {exc}"
            return fallback
        return {entry.index: local_full_suggestion(entry) for entry in entries}

    def run_suggestion_action(self) -> None:
        if self.store is None:
            return
        indices = self.selected_indices()
        if not indices:
            QMessageBox.information(self, "Keine Auswahl", "Bitte zuerst eine oder mehrere Übungen markieren.")
            return
        entries = [self.store.entries_by_index.get(index_value) for index_value in indices]
        entries = [entry for entry in entries if entry is not None]
        if not entries:
            return
        review_rows: list[dict[str, object]] = []
        suggestions_by_index = self._build_bulk_suggestions(entries)
        for entry in entries:
            review_rows.append({"entry": entry, "suggestion": suggestions_by_index.get(entry.index, local_full_suggestion(entry))})
        if not review_rows:
            return
        dialog = SuggestionReviewDialog(self, review_rows)
        if dialog.exec() != QDialog.Accepted:
            self.statusBar().showMessage("KI-Vorschläge verworfen.", 4000)
            return
        selected_payload = dialog.selected_payload()
        if not selected_payload:
            self.statusBar().showMessage("Keine KI-Vorschläge übernommen.", 4000)
            return
        if len(indices) == 1:
            index_value = indices[0]
            payload = selected_payload.get(index_value)
            if not payload or self.current_index is None:
                self.statusBar().showMessage("Kein KI-Vorschlag für die aktuelle Auswahl übernommen.", 4000)
                return
            current_values = {
                field_name: (
                    self.field_inputs[field_name].currentData() if isinstance(self.field_inputs[field_name], QComboBox)
                    else self.field_inputs[field_name].text().strip() if isinstance(self.field_inputs[field_name], QLineEdit)
                    else self.field_inputs[field_name].toPlainText().strip()
                )
                for field_name in AI_SUGGEST_FIELDS
            }
            for field_name in AI_SUGGEST_FIELDS:
                widget = self.field_inputs[field_name]
                value = payload.get(field_name, "")
                if isinstance(widget, QLineEdit):
                    widget.setText(value)
                elif isinstance(widget, QComboBox):
                    widget.setCurrentIndex(max(0, widget.findData(value)))
                else:
                    widget.setPlainText(value)
            self.suggestion_text.setPlainText(
                f"Index {index_value}\n"
                f"Name-Vorschlag: {payload.get('name', '')}\n"
                f"NameEn-Vorschlag: {payload.get('nameEn', '')}\n\n"
                f"Hinweis: {dialog.reason_for(index_value)}\n"
                "Der Vorschlag wurde in die Bearbeitungsfelder übernommen, aber noch nicht in Excel gespeichert."
            )
            changed_fields: list[str] = []
            for field_name in AI_SUGGEST_FIELDS:
                widget = self.field_inputs[field_name]
                new_value = (
                    str(widget.currentData() or "").strip() if isinstance(widget, QComboBox)
                    else widget.text().strip() if isinstance(widget, QLineEdit)
                    else widget.toPlainText().strip()
                )
                if current_values.get(field_name, "") != new_value:
                    changed_fields.append(field_name)
            self._sync_selector_states(
                {
                    "categories": self.field_text_list(self.field_inputs["categories"].text()),
                    "categoriesEn": self.field_text_list(self.field_inputs["categoriesEn"].text()),
                    "muscles": self.field_text_list(self.field_inputs["muscles"].text()),
                    "musclesEn": self.field_text_list(self.field_inputs["musclesEn"].text()),
                    "musclesLatin": self.field_text_list(self.field_inputs["musclesLatin"].text()),
                }
            )
            if not changed_fields:
                self.statusBar().showMessage("KI-Vorschlag geprüft: keine sichtbare Änderung gegenüber den aktuellen Feldern.", 6000)
            else:
                self.statusBar().showMessage(f"KI-Vorschlag in Bearbeiten übernommen: {', '.join(changed_fields)}", 6000)
            return

        snapshot = self.store.snapshot_entries(list(selected_payload.keys()), AI_SUGGEST_FIELDS)
        self.ensure_excel_backup()
        try:
            changed = self.store.save_entries_bulk(selected_payload)
        except Exception as exc:
            QMessageBox.critical(self, "KI-Übernahme fehlgeschlagen", str(exc))
            return
        if changed:
            self.undo_stack.append({"indices": list(changed), "snapshot": snapshot, "label": "KI-Vorschläge übernommen"})
        self.load_data()
        self._reselect_indices(indices)
        self.suggestion_text.setPlainText(
            "Mehrfachauswahl: KI-Vorschläge übernommen für\n"
            + ", ".join(str(index_value) for index_value in sorted(selected_payload.keys())[:20])
            + (" ..." if len(selected_payload) > 20 else "")
            + "\n\nDie Änderungen wurden direkt in Excel gespeichert und können über 'Letzte Änderung rückgängig' zurückgenommen werden."
        )
        self.statusBar().showMessage(f"KI-Vorschläge für {len(changed)} Einträge übernommen.", 6000)

    def export_json(self) -> None:
        if self.store is None:
            return
        try:
            if not self.json_input.text().strip():
                raise RuntimeError("Bitte zuerst einen Pfad für die App-JSON setzen.")
            if not self.report_input.text().strip():
                raise RuntimeError("Bitte zuerst einen Pfad für den Export-Report setzen.")
            self.ensure_json_backup()
            report_output_path = self._resolve_report_output_path()
            result = self.store.export_json(Path(self.json_input.text()), report_output_path)
        except Exception as exc:
            QMessageBox.critical(self, "Exportfehler", str(exc))
            return
        QMessageBox.information(
            self,
            "Export abgeschlossen",
            f"Übungen exportiert: {result['exported_count']}\n"
            f"JSON: {result['output_json_path']}\n"
            f"Report: {result['report_path']}\n"
            f"Fehlende Animationen: {len(result['missing_animations'])}\n"
            f"Warnungen: {len(result['warnings'])}",
        )
        self.statusBar().showMessage("JSON exportiert.", 5000)

    def undo_last_change(self) -> None:
        if self.store is None:
            return
        if not self.undo_stack:
            QMessageBox.information(self, "Keine Änderung", "Es gibt keine gespeicherte Änderung zum Rückgängigmachen.")
            return
        undo_item = self.undo_stack.pop()
        snapshot = undo_item["snapshot"]
        indices = undo_item["indices"]
        try:
            self.store.save_entries_bulk(snapshot)
        except Exception as exc:
            QMessageBox.critical(self, "Undo fehlgeschlagen", str(exc))
            return
        self.load_data()
        self._reselect_indices(indices)
        self.statusBar().showMessage("Letzte Änderung rückgängig gemacht.", 5000)

    def show_table_context_menu(self, pos) -> None:
        item = self.table.itemAt(pos)
        if not item:
            return
        row = item.row()
        first_item = self.table.item(row, 0)
        indices = sorted(set(first_item.data(Qt.UserRole) or [])) if first_item else []
        if not indices:
            return
        self.table.selectRow(row)
        menu = QMenu(self)
        ai_action = menu.addAction(f"KI-Vorschläge prüfen ({len(indices)})")
        menu.addSeparator()
        edit_actions: dict[QAction, int] = {}
        delete_actions: dict[QAction, int] = {}
        edit_menu = menu.addMenu("Einzelnen Index bearbeiten")
        delete_menu = menu.addMenu("Einzelnen Index löschen")
        for index_value in indices:
            edit_actions[edit_menu.addAction(f"Index {index_value} bearbeiten")] = index_value
            delete_actions[delete_menu.addAction(f"Index {index_value} löschen")] = index_value
        pair_actions: dict[QAction, tuple[int, int]] = {}
        gender_pairs = self._gender_pair_candidates(indices)
        if gender_pairs:
            pair_menu = menu.addMenu("Als Gender-Paar markieren")
            for first_index, second_index in gender_pairs:
                first_gender = self.store.entries_by_index[first_index].values.get("gender", "")
                second_gender = self.store.entries_by_index[second_index].values.get("gender", "")
                label = f"Index {first_index} ({first_gender}) + Index {second_index} ({second_gender})"
                pair_actions[pair_menu.addAction(label)] = (first_index, second_index)
        chosen = menu.exec(self.table.viewport().mapToGlobal(pos))
        if chosen == ai_action:
            self.current_preview_indices = list(indices)
            self.run_suggestion_action()
        elif chosen in edit_actions:
            self.current_preview_indices = list(indices)
            self.activate_single_index_edit(edit_actions[chosen])
        elif chosen in delete_actions:
            remaining = [value for value in indices if value != delete_actions[chosen]]
            self.delete_selected_entries([delete_actions[chosen]], reselection_candidates=remaining)
        elif chosen in pair_actions:
            self.assign_gender_variant_pair(*pair_actions[chosen], reselection_candidates=indices)

    def _gender_pair_candidates(self, indices: list[int]) -> list[tuple[int, int]]:
        if self.store is None:
            return []
        male_indices: list[int] = []
        female_indices: list[int] = []
        for index_value in sorted(set(indices)):
            entry = self.store.entries_by_index.get(index_value)
            if not entry:
                continue
            gender_value = str(entry.values.get("gender", "")).strip().casefold()
            if gender_value == "m":
                male_indices.append(index_value)
            elif gender_value == "w":
                female_indices.append(index_value)
        return [(male_index, female_index) for male_index in male_indices for female_index in female_indices]

    def assign_gender_variant_pair(self, first_index: int, second_index: int, reselection_candidates: list[int] | None = None) -> None:
        if self.store is None:
            return
        if first_index == second_index:
            return
        indices = [first_index, second_index]
        group_key = self._make_gender_variant_group_key(indices)
        snapshot = self.store.snapshot_entries(indices, ["genderVariantGroup"])
        self.ensure_excel_backup()
        try:
            changed = self.store.save_entries_bulk(
                {
                    first_index: {"genderVariantGroup": group_key},
                    second_index: {"genderVariantGroup": group_key},
                }
            )
        except Exception as exc:
            QMessageBox.critical(self, "Gender-Paar fehlgeschlagen", str(exc))
            return
        if changed:
            self.undo_stack.append({"indices": list(changed), "snapshot": snapshot, "label": f"Gender-Paar {first_index}/{second_index}"})
        self.load_data()
        if reselection_candidates:
            self._reselect_indices(reselection_candidates)
        self.statusBar().showMessage(
            f"Gender-Paar gesetzt: Index {first_index} und {second_index} -> {group_key}",
            7000,
        )

    def on_preview_clicked(self, view: QWebEngineView) -> None:
        index_value = view.property("auditPreviewIndex")
        if index_value is None:
            return
        try:
            index_number = int(index_value)
        except (TypeError, ValueError):
            return
        self.statusBar().showMessage(
            f"Vorschau Index {index_number}. Rechtsklick für 'bearbeiten' oder 'löschen'.",
            4000,
        )

    def show_preview_context_menu(self, view: QWebEngineView, pos) -> None:
        index_value = view.property("auditPreviewIndex")
        if index_value is None:
            return
        try:
            index_number = int(index_value)
        except (TypeError, ValueError):
            return
        menu = QMenu(self)
        delete_action = menu.addAction(f"Index {index_number} löschen")
        edit_action = menu.addAction(f"Index {index_number} bearbeiten")
        chosen = menu.exec(view.mapToGlobal(pos))
        if chosen == delete_action:
            remaining = [value for value in self.current_preview_indices if value != index_number]
            self.delete_selected_entries([index_number], reselection_candidates=remaining)
        elif chosen == edit_action:
            self.activate_single_index_edit(index_number)

    def activate_single_index_edit(self, index_value: int) -> None:
        if self.store is None or index_value not in self.store.entries_by_index:
            return
        source_indices = [value for value in self.current_preview_indices if value in self.store.entries_by_index]
        self.explicit_edit_index = index_value
        self.current_selection_indices = [index_value]
        self.pending_multi_assignments = {}
        self.load_entry(index_value)
        if len(source_indices) > 1:
            self._set_edit_scope_message(
                f"Aktiv bearbeitet wird nur Index {index_value}. "
                "Bearbeiten und Schnellzuweisung wirken nur auf diesen einen Eintrag. "
                "Die restlichen Animationen der Gruppe dienen nur zum Vergleich."
            )
        else:
            self._set_edit_scope_message(
                f"Aktiv bearbeitet wird nur Index {index_value}. "
                "Bearbeiten und Schnellzuweisung wirken nur auf diesen einen Eintrag."
            )
        self.statusBar().showMessage(f"Einzelbearbeitung für Index {index_value} aktiviert.", 5000)

    def delete_selected_entries(self, indices: list[int], reselection_candidates: list[int] | None = None) -> None:
        if self.store is None or not indices:
            return
        answer = QMessageBox.question(
            self,
            "Einträge löschen",
            "Diese Einträge werden aus der Excel-Datei gelöscht:\n\n"
            + ", ".join(str(index_value) for index_value in indices[:20])
            + (" ..." if len(indices) > 20 else "")
            + "\n\nFortfahren?",
        )
        if answer != QMessageBox.Yes:
            return
        self.ensure_excel_backup()
        try:
            deleted = self.store.delete_entries(indices)
        except Exception as exc:
            QMessageBox.critical(self, "Löschen fehlgeschlagen", str(exc))
            return
        self.load_data()
        remaining = [value for value in (reselection_candidates or []) if value not in deleted]
        if remaining:
            self._reselect_indices(remaining)
        self.statusBar().showMessage(f"{len(deleted)} Einträge gelöscht.", 5000)

    def selected_indices(self) -> list[int]:
        if self.explicit_edit_index is not None:
            return [self.explicit_edit_index]
        indices: list[int] = []
        seen: set[int] = set()
        for model_index in self.table.selectionModel().selectedRows():
            row = model_index.row()
            first_item = self.table.item(row, 0)
            if not first_item:
                continue
            for index_value in first_item.data(Qt.UserRole) or []:
                if index_value is None or index_value in seen:
                    continue
                seen.add(index_value)
                indices.append(int(index_value))
        return indices

    def _select_index(self, index_value: int) -> None:
        for row in range(self.table.rowCount()):
            first_item = self.table.item(row, 0)
            if first_item and index_value in (first_item.data(Qt.UserRole) or []):
                self.table.selectRow(row)
                self.load_selection([index_value])
                return

    def _reselect_indices(self, indices: list[int]) -> None:
        self.table.clearSelection()
        target = set(indices)
        for row in range(self.table.rowCount()):
            first_item = self.table.item(row, 0)
            row_indices = set(first_item.data(Qt.UserRole) or []) if first_item else set()
            if target.intersection(row_indices):
                self.table.selectRow(row)

    def _open_path(self, path_text: str) -> None:
        path = Path(path_text)
        if not path.exists():
            QMessageBox.warning(self, "Pfad fehlt", f"Pfad nicht gefunden:\n{path}")
            return
        os.startfile(str(path))

    def _open_preview_index(self, index_value: int) -> None:
        mode = self.preview_background_mode.currentData()
        self.quick_preview_index_label.setText(str(index_value))
        for web in self.preview_views:
            web.setProperty("auditPreviewIndex", index_value)
            web.page().runJavaScript(f"window.openAnimationIndex({index_value});")
            web.page().runJavaScript(f"window.setAuditBackground('{mode}');")

    def _reset_preview_views(self) -> None:
        mode = self.preview_background_mode.currentData()
        for web in [*self.preview_views, *self.compare_preview_views]:
            web.setProperty("auditPreviewIndex", None)
            web.page().runJavaScript("window.resetAuditPreview();")
            web.page().runJavaScript(f"window.setAuditBackground('{mode}');")

    def apply_preview_background(self) -> None:
        mode = self.preview_background_mode.currentData()
        for web in [*self.preview_views, *self.compare_preview_views]:
            web.page().runJavaScript(f"window.setAuditBackground('{mode}');")

    def show_guide_dialog_v3(self) -> None:
        html = """
        <h1 style="font-size:22px; margin-bottom:18px;">Anleitung</h1>
        <h2 style="font-size:18px; font-weight:700; margin-top:22px;">1. Einstellungen</h2>
        <p><b>Einstellungen -> Pfade...</b><br>Legt Excel-Master, App-JSON, Animationsordner und Export-Report fest.<br>Hier wird nichts exportiert oder verändert, nur die Pfade werden gespeichert.</p>
        <p><b>Einstellungen -> KI-Anbieter...</b><br>Konfiguriert optional einen OpenAI-kompatiblen Anbieter.<br>Ohne Anbieter nutzt das Tool lokale Heuristiken.</p>
        <p><b>Einstellungen -> Vorschau-Hintergrund</b><br>Ändert nur die Darstellung der Vorschau, nicht die Daten.</p>
        <h2 style="font-size:18px; font-weight:700; margin-top:22px;">2. Aktionen</h2>
        <p><b>Aktionen -> Daten neu einlesen</b><br>Liest den aktuellen Stand erneut aus der Excel-Datei, dem Animationsordner und der eingestellten App-JSON ein.<br>Dabei wird nichts geschrieben oder überschrieben.<br>Nicht gespeicherte Änderungen im Bearbeiten-Bereich gehen dabei verloren.</p>
        <p><b>Aktionen -> Excel -> JSON exportieren</b><br>Exportiert den bereits auf der Festplatte gespeicherten Excel-Stand in die eingestellte App-JSON und in den Export-Report.<br>Darum bei Einzelbearbeitung immer zuerst 'Änderungen in Excel speichern' klicken.<br>JSON-Zieldatei und Report-Zieldatei werden dabei überschrieben.</p>
        <p><b>Aktionen -> Letzte Änderung rückgängig</b><br>Stellt die zuletzt gespeicherte Änderung an Excel-Feldern wieder her.</p>
        <h2 style="font-size:18px; font-weight:700; margin-top:22px;">3. Tabelle und Ansichten</h2>
        <p>Einzelliste zeigt einzelne Übungen.<br>Dubletten-Gruppen fassen gleiche deutsche Namen zusammen.<br>Gender-Varianten Paare zeigen bereits eindeutige Mann/Frau-Paare: gleicher deutscher Name, genau zwei Einträge, einer mit 'm' und einer mit 'w', beide mit derselben Gender-Variante Gruppe.<br>Gender-Varianten Kandidaten zeigen noch unklare Fälle: gleicher deutscher Name, gemischte Gender-Werte, aber noch kein eindeutiges Paar. Das sind oft drei oder mehr Einträge oder Fälle, bei denen noch nicht klar markiert ist, welche zwei zusammengehören.<br>In der Spalte 'Dubletten' steht dabei, wie viele Einträge zu dieser Gruppe gehören.<br>Kategorie-Konflikt-Gruppen fassen Treffer der 'ohne Gerät'-Heuristik zusammen.<br>Der zweite Umschalter filtert zusätzlich nach Problemtyp.</p>
        <h2 style="font-size:18px; font-weight:700; margin-top:22px;">4. Status</h2>
        <p><b>OK</b><br>Excel und App-JSON stimmen überein.</p>
        <p><b>Duplikatname</b><br>Derselbe deutsche Name kommt mehrfach vor.</p>
        <p><b>Verdächtiger Name</b><br>Name wirkt automatisch erzeugt oder sprachlich schief.</p>
        <p><b>JSON abweichend</b><br>Excel-Master und App-JSON unterscheiden sich in mindestens einem Feld.</p>
        <p><b>Kategorie prüfen</b><br>'ohne Gerät' passt vermutlich nicht zur Übung.</p>
        <p><b>Animation fehlt</b><br>Für den Index wurde keine Lottie-Datei gefunden.</p>
        <h2 style="font-size:18px; font-weight:700; margin-top:22px;">5. Auswahl und Bearbeiten</h2>
        <p><b>Einzelauswahl</b><br>Bearbeiten und Schnellzuweisung wirken auf genau diesen einen Index.<br>Änderungen werden erst mit 'Änderungen in Excel speichern' dauerhaft übernommen.</p>
        <p><b>Mehrfachauswahl</b><br>Bearbeiten ist deaktiviert.<br>Schnellzuweisung bleibt aktiv.<br>Leer = keine markierte Übung hat den Wert.<br>Haken = alle markierten Übungen haben den Wert.<br>Zwischenzustand = nur ein Teil der Auswahl hat den Wert.<br>Änderungen aus der Schnellzuweisung werden erst mit 'Änderungen in Excel speichern' übernommen.</p>
        <p><b>Rechtsklick auf Tabelle oder Vorschau</b><br>Erlaubt immer nur indexbezogene Aktionen.<br>Beim Bearbeiten eines einzelnen Index erscheint oben rechts ein Hinweis, dass Bearbeiten und Schnellzuweisung nur auf diesen einen Eintrag wirken.<br>In Gruppenzeilen kann zusätzlich 'Als Gender-Paar markieren' erscheinen, um genau zwei Indizes miteinander zu verbinden.</p>
        <p><b>KI-Vorschlag</b><br>Öffnet immer erst ein Prüf-Fenster.<br>Dort kannst du Vorschläge pro Index in Tabellenform ansehen, bearbeiten, einzeln abwählen und dann gezielt übernehmen.<br>Vorgeschlagen werden alle Felder aus Bearbeiten und die zugehörigen Listenfelder aus der Schnellzuweisung.<br>Bei Mehrfachauswahl versucht das Tool die KI gesammelt statt einzeln anzufragen, um unnötig viele Requests zu vermeiden.<br>Bei Einzelauswahl werden die übernommenen Werte nur in die rechten Bearbeitungsfelder eingetragen und noch nicht gespeichert.<br>Bei Mehrfachauswahl werden die ausdrücklich übernommenen Vorschläge direkt in Excel geschrieben und können über 'Letzte Änderung rückgängig' wieder zurückgenommen werden.</p>
        <h2 style="font-size:18px; font-weight:700; margin-top:22px;">6. KI-Vorschlag</h2>
        <p>Der Button öffnet immer erst ein Prüf-Fenster.<br>Dort werden die Vorschläge pro markiertem Index für alle relevanten Felder angezeigt.<br>Du kannst jede vorgeschlagene Zeile und jedes Feld vor der Übernahme bearbeiten, einzelne Zeilen abwählen und dann gezielt übernehmen.<br>Einzelauswahl übernimmt nur in die rechten Bearbeitungsfelder.<br>Mehrfachauswahl schreibt die ausdrücklich übernommenen Vorschläge direkt in Excel.</p>
        <h2 style="font-size:18px; font-weight:700; margin-top:22px;">7. Vorschlag / Hinweise</h2>
        <p>Zeigt Status-Hinweise, Duplikat-Indizes, JSON-Abweichungen und KI-Vorschläge.<br>Der Tooltip dieses Bereichs zeigt nur den Status der aktuellen Auswahl.</p>
        <h2 style="font-size:18px; font-weight:700; margin-top:22px;">8. Empfohlener Ablauf</h2>
        <p>1. Pfade prüfen.<br>2. Daten neu einlesen.<br>3. Ansicht und Filter wählen.<br>4. Übung oder Gruppe markieren.<br>5. Prüfen, anpassen, ggf. KI-Vorschlag nutzen.<br>6. Bei Einzelauswahl speichern.<br>7. Zum Schluss Excel -> JSON exportieren.</p>
        """
        dialog = QDialog(self)
        dialog.setWindowTitle("Anleitung")
        layout = QVBoxLayout(dialog)
        guide = QTextEdit()
        guide.setReadOnly(True)
        guide.setHtml(html)
        layout.addWidget(guide)
        buttons = QDialogButtonBox(QDialogButtonBox.Close)
        buttons.rejected.connect(dialog.reject)
        buttons.accepted.connect(dialog.accept)
        buttons.clicked.connect(dialog.accept)
        layout.addWidget(buttons)
        dialog.resize(max(760, self.width() // 2), min(920, max(660, self.height() - 100)))
        dialog.exec()


def main() -> None:
    app = QApplication(sys.argv)
    app.setApplicationName("Exercise Audit Tool")
    base_dir = Path(sys.argv[0]).resolve().parent
    window = AuditWindow(base_dir)
    window.showMaximized()
    sys.exit(app.exec())


if __name__ == "__main__":
    main()
