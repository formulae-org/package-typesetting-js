/*
Fōrmulæ typesetting package. Module for edition.
Copyright (C) 2015-2023 Laurence R. Ugalde

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

'use strict';

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
	Formulae.addEdition(this.messages["pathTypesetting"], null, this.messages["leafParagraph"],       () => Expression.wrapperEdition("Typesetting.Paragraph"));
	Formulae.addEdition(this.messages["pathTypesetting"], null, this.messages["leafBoldChunk"],       () => Expression.wrapperEdition("Typesetting.BoldChunk"));
	Formulae.addEdition(this.messages["pathTypesetting"], null, this.messages["leafItalicChunk"],     () => Expression.wrapperEdition("Typesetting.ItalicChunk"));
	Formulae.addEdition(this.messages["pathTypesetting"], null, this.messages["leafColorChunk"],      Typesetting.editionColorChunk);
	Formulae.addEdition(this.messages["pathTypesetting"], null, this.messages["leafMultiParagraph"],  () => Expression.multipleEdition("Typesetting.MultiParagraph", 2, 0));
	Formulae.addEdition(this.messages["pathTypesetting"], null, this.messages["leafBulletedList"],    () => Expression.wrapperEdition("Typesetting.BulletedList"));
	Formulae.addEdition(this.messages["pathTypesetting"], null, this.messages["leafCentering"],       () => Expression.wrapperEdition("Typesetting.Centering"));
	Formulae.addEdition(this.messages["pathTypesetting"], null, this.messages["leafRule"],            () => Expression.replacingEdition("Typesetting.Rule"));

	Formulae.addEdition(this.messages["pathReflection"],  null, this.messages["leafCreateParagraph"], () => Expression.wrapperEdition("Typesetting.CreateParagraph"));
};
