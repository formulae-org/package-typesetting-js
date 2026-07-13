/*
Fōrmulæ typesetting package. Module for edition.
Copyright (C) 2015-2026 Laurence R. Ugalde

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

"use strict";

export class Typesetting extends Formulae.Package {}

Typesetting.editionColorChunk = function() {
	Formulae.Forms.colorSelection(0, 0, 0, 1, (red, green, blue, alpha) => {
		let newExpression = Formulae.createExpression("Typesetting.ColorChunk");
		newExpression.set("Red",   red  );
		newExpression.set("Green", green);
		newExpression.set("Blue",  blue );
		newExpression.set("Alpha", alpha);
		
		Formulae.sExpression.replaceBy(newExpression);
		newExpression.addChild(Formulae.sExpression);
		
		Formulae.sHandler.prepareDisplay();
		Formulae.sHandler.display();
		Formulae.setSelected(Formulae.sHandler, newExpression, false);
	});
}

Typesetting.setEditions = function() {

	Formulae.addEdition(this.messages["pathTypesetting"], '<expression tag="Typesetting.Paragraph"><expression tag="Visualization.Selected"><expression tag="Null"/></expression></expression>', this.messages["leafParagraph"],       () => Expression.wrapperEdition("Typesetting.Paragraph"));

	// Bold/Italic: wrapped in a real Paragraph so the engine actually renders the style (Paragraph.appendExpression intercepts these tags) — a filled "x" placeholder is required since an empty Null slot carries no visible text to style
	Formulae.addEdition(this.messages["pathTypesetting"], '<expression tag="Typesetting.Paragraph"><expression tag="Typesetting.BoldChunk"><expression tag="Visualization.Selected"><expression tag="String.Text" Value="x"/></expression></expression></expression>',   this.messages["leafBoldChunk"],       () => Expression.wrapperEdition("Typesetting.BoldChunk"));
	Formulae.addEdition(this.messages["pathTypesetting"], '<expression tag="Typesetting.Paragraph"><expression tag="Typesetting.ItalicChunk"><expression tag="Visualization.Selected"><expression tag="String.Text" Value="x"/></expression></expression></expression>', this.messages["leafItalicChunk"],     () => Expression.wrapperEdition("Typesetting.ItalicChunk"));

	// ColorChunk: prompted (color picker), like arithmetic's Number / color's Color
	Formulae.addEdition(this.messages["pathTypesetting"], this.messages["leafColorChunk"], this.messages["leafColorChunk"], Typesetting.editionColorChunk);

	Formulae.addEdition(this.messages["pathTypesetting"], Formulae.icon("Typesetting.MultiParagraph", 2), this.messages["leafMultiParagraph"],  () => Expression.multipleEdition("Typesetting.MultiParagraph", 2, 0));

	Formulae.addEdition(this.messages["pathTypesetting"], '<expression tag="Typesetting.BulletedList"><expression tag="Visualization.Selected"><expression tag="Null"/></expression></expression>', this.messages["leafBulletedList"],    () => Expression.wrapperEdition("Typesetting.BulletedList"));
	Formulae.addEdition(this.messages["pathTypesetting"], '<expression tag="Typesetting.NumberedList"><expression tag="Visualization.Selected"><expression tag="Null"/></expression></expression>', this.messages["leafNumberedList"],    () => Expression.wrapperEdition("Typesetting.NumberedList"));

	// Centering/Rule: layout scales with the live main-panel width, cannot be shrunk to icon size faithfully
	Formulae.addEdition(this.messages["pathTypesetting"], this.messages["leafCentering"], this.messages["leafCentering"], () => Expression.wrapperEdition("Typesetting.Centering"));
	Formulae.addEdition(this.messages["pathTypesetting"], this.messages["leafRule"],      this.messages["leafRule"],      () => Expression.replacingEdition("Typesetting.Rule"));

	Formulae.addEdition(this.messages["pathReflection"],  Formulae.icon("Typesetting.CreateParagraph", 1), this.messages["leafCreateParagraph"], () => Expression.wrapperEdition("Typesetting.CreateParagraph"));
};

