package io.github.thomashtn.bookreader;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.classes;
import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;
import static com.tngtech.archunit.library.Architectures.layeredArchitecture;
import static com.tngtech.archunit.library.dependencies.SlicesRuleDefinition.slices;

import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.junit.AnalyzeClasses;
import com.tngtech.archunit.junit.ArchTest;
import com.tngtech.archunit.lang.ArchRule;
import com.tngtech.archunit.library.Architectures.LayeredArchitecture;
import java.util.ArrayList;
import java.util.List;

/**
 * Keeps the feature packages a one-way graph, as described in the package map of backend/README.md.
 *
 * <p>A package may only use lower tiers, never a same-tier sibling; new packages must join {@link #TIERS}.
 * Inside a feature, requests flow controller, service, repository, and entities and DTOs depend on none of them.</p>
 */
@AnalyzeClasses(packages = ArchitectureTest.ROOT, importOptions = ImportOption.DoNotIncludeTests.class)
final class ArchitectureTest {

    /**
     * Root package of the application.
     */
    static final String ROOT = "io.github.thomashtn.bookreader";

    /**
     * Top-level packages from the bottom tier to the top one.
     */
    private static final List<List<String>> TIERS = List.of(
        List.of("shared"),
        List.of("settings", "conversion"),
        List.of("book"),
        List.of("catalogue")
    );

    /**
     * Every package only reaches down the tiers, never up nor sideways.
     */
    @ArchTest
    static final ArchRule PACKAGES_ONLY_DEPEND_ON_LOWER_TIERS = tieredLayers();

    /**
     * No cycle between top-level packages, whatever the tiers say.
     */
    @ArchTest
    static final ArchRule PACKAGES_ARE_FREE_OF_CYCLES = slices()
        .matching(ROOT + ".(*)..")
        .should().beFreeOfCycles();

    /**
     * Every class sits in the root package or in a package the tiers place.
     */
    @ArchTest
    static final ArchRule EVERY_PACKAGE_IS_PLACED = classes()
        .should().resideInAnyPackage(placedPackages())
        .because("a new top-level package must be given a tier in ArchitectureTest.TIERS");

    /**
     * Controllers are the entry points: no other class calls them.
     */
    @ArchTest
    static final ArchRule NOTHING_DEPENDS_ON_CONTROLLERS = noClasses()
        .that().resideOutsideOfPackage(ROOT + "..controller..")
        .should().dependOnClassesThat().resideInAPackage(ROOT + "..controller..");

    /**
     * Repositories are reached through a service only, never from a controller, an entity or a DTO.
     */
    @ArchTest
    static final ArchRule ONLY_SERVICES_USE_REPOSITORIES = noClasses()
        .that().resideOutsideOfPackages(ROOT + "..repository..", ROOT + "..service..")
        .should().dependOnClassesThat().resideInAPackage(ROOT + "..repository..");

    /**
     * Entities and DTOs are plain data: they never call a service, a repository or a controller.
     */
    @ArchTest
    static final ArchRule DATA_CLASSES_DEPEND_ON_NO_LOGIC = noClasses()
        .that().resideInAnyPackage(ROOT + "..entity..", ROOT + "..dto..")
        .should().dependOnClassesThat()
        .resideInAnyPackage(ROOT + "..service..", ROOT + "..repository..", ROOT + "..controller..");

    /**
     * Holds rules only; ArchUnit reads the static fields without an instance.
     */
    private ArchitectureTest() {
    }

    /**
     * Builds the layered rule: each package may only be used by the packages of a higher tier.
     *
     * @return the layered architecture rule
     */
    private static LayeredArchitecture tieredLayers() {
        LayeredArchitecture architecture = layeredArchitecture().consideringOnlyDependenciesInLayers();
        for (List<String> tier : TIERS) {
            for (String name : tier) {
                architecture = architecture.layer(name).definedBy(ROOT + "." + name + "..");
            }
        }
        for (int index = 0; index < TIERS.size(); index++) {
            List<String> above = TIERS.subList(index + 1, TIERS.size()).stream()
                .flatMap(List::stream)
                .toList();
            for (String name : TIERS.get(index)) {
                architecture = above.isEmpty()
                    ? architecture.whereLayer(name).mayNotBeAccessedByAnyLayer()
                    : architecture.whereLayer(name).mayOnlyBeAccessedByLayers(above.toArray(String[]::new));
            }
        }
        return architecture;
    }

    /**
     * Lists the root package and every placed top-level package with its subpackages.
     *
     * @return package identifiers in ArchUnit syntax
     */
    private static String[] placedPackages() {
        List<String> packages = new ArrayList<>();
        packages.add(ROOT);
        TIERS.forEach(tier -> tier.forEach(name -> packages.add(ROOT + "." + name + "..")));
        return packages.toArray(String[]::new);
    }
}
